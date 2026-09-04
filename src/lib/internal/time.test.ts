import { describe, expect, it } from 'vitest';
import {
  clampTime,
  from12Hour,
  pad2,
  parseISOTime,
  stepSegment,
  to12Hour,
  toISOTime,
  withinTimeRange,
} from './time.js';
import type { TimeParts } from './time.js';

/**
 * Each block below is a mistake a TimePicker makes on the first attempt: a
 * parser that rolls '24:00' over into the next midnight, a minute step that
 * carries into the hour, a range check that cannot express a night shift,
 * per-segment clamping that rewrites a legal time, and the modulo that turns
 * both midnight and noon into hour zero.
 */

const t = (h: number, mi: number, s = 0): TimeParts => ({ h, mi, s });

const HOURS = Array.from({ length: 24 }, (_, i) => i);

describe('parseISOTime', () => {
  it.each<string | undefined | null>([
    '24:00',
    '00:60',
    '9:30',
    '09:30:60',
    '',
    undefined,
    null,
    '23:59:59.5',
    '09:30+02:00',
    '09:30:',
    '0930',
  ])('rejects %s rather than rolling it over', (input) => {
    expect(parseISOTime(input)).toBeNull();
  });

  it.each<[string, TimeParts]>([
    ['00:00', t(0, 0)],
    ['09:30', t(9, 30)],
    ['23:59', t(23, 59)],
    ['09:30:15', t(9, 30, 15)],
    ['23:59:59', t(23, 59, 59)],
    ['00:00:00', t(0, 0, 0)],
  ])('accepts %s', (input, parts) => {
    expect(parseISOTime(input)).toEqual(parts);
  });

  it('reads an absent second segment as zero, not as missing', () => {
    expect(parseISOTime('09:30')).toEqual({ h: 9, mi: 30, s: 0 });
  });
});

describe('toISOTime', () => {
  it.each<[TimeParts, boolean, string]>([
    [t(9, 5), false, '09:05'],
    [t(9, 5), true, '09:05:00'],
    [t(0, 0, 0), false, '00:00'],
    [t(0, 0, 0), true, '00:00:00'],
    [t(23, 59, 59), false, '23:59'],
    [t(23, 59, 59), true, '23:59:59'],
    [t(1, 2, 3), true, '01:02:03'],
  ])('writes %o with seconds %s as %s', (parts, seconds, expected) => {
    expect(toISOTime(parts, seconds)).toBe(expected);
  });

  it.each<[string, boolean]>([
    ['09:30', false],
    ['00:00', false],
    ['23:59:59', true],
    ['01:02:03', true],
  ])('round-trips %s back through the parser', (value, seconds) => {
    const parsed = parseISOTime(value);
    expect(parsed).not.toBeNull();
    if (parsed === null) return;
    expect(toISOTime(parsed, seconds)).toBe(value);
  });
});

describe('stepSegment', () => {
  it.each([1, 15])(
    'wraps the minute 59 to 0 and 0 to 59 at step %i, leaving the hour alone',
    (step) => {
      expect(stepSegment(t(9, 59), 'minute', 1, step)).toEqual(t(9, 0));
      expect(stepSegment(t(9, 0), 'minute', -1, step)).toEqual(t(9, 59));
    },
  );

  it.each<[number, number, number, number]>([
    [15, 0, 1, 15],
    [15, 15, 1, 30],
    [15, 30, 1, 45],
    [15, 45, 1, 0],
    [15, 45, -1, 30],
    [15, 0, -1, 59],
    [5, 55, 1, 0],
    [1, 30, 1, 31],
    [1, 30, -1, 29],
    [30, 0, 1, 30],
    [30, 30, 1, 0],
  ])('step %i moves the minute %i by %i to %i', (step, from, delta, expected) => {
    expect(stepSegment(t(9, from), 'minute', delta, step).mi).toBe(expected);
  });

  it.each([7, 13, 45, 59])(
    'step %i does not divide 60 and still lands on a legal minute',
    (step) => {
      for (const mi of Array.from({ length: 60 }, (_, i) => i)) {
        for (const delta of [-1, 1]) {
          const next = stepSegment(t(9, mi, 30), 'minute', delta, step);
          expect(next.mi, `minute ${mi} by ${delta * step}`).toBeGreaterThanOrEqual(0);
          expect(next.mi, `minute ${mi} by ${delta * step}`).toBeLessThanOrEqual(59);
          expect(next.h, 'the hour carried').toBe(9);
          expect(next.s, 'the second carried').toBe(30);
          expect(parseISOTime(toISOTime(next, true))).toEqual(next);
        }
      }
    },
  );

  it.each([1, 7, 15])('wraps the hour 23 to 0 and 0 to 23 at step %i', (step) => {
    expect(stepSegment(t(23, 30, 15), 'hour', 1, step)).toEqual(t(0, 30, 15));
    expect(stepSegment(t(0, 30, 15), 'hour', -1, step)).toEqual(t(23, 30, 15));
  });

  it.each([1, 15, 45])('wraps the second 59 to 0 and 0 to 59 at step %i', (step) => {
    expect(stepSegment(t(9, 30, 59), 'second', 1, step)).toEqual(t(9, 30, 0));
    expect(stepSegment(t(9, 30, 0), 'second', -1, step)).toEqual(t(9, 30, 59));
  });

  it.each<['hour' | 'minute' | 'second', number]>([
    ['hour', 1],
    ['hour', 15],
    ['minute', 1],
    ['minute', 15],
    ['second', 1],
    ['second', 15],
  ])('leaves %s untouched when delta is zero at step %i', (segment, step) => {
    expect(stepSegment(t(9, 30, 15), segment, 0, step)).toEqual(t(9, 30, 15));
  });

  it.each<[number, number, number]>([
    [9, 1, 21],
    [21, 1, 9],
    [0, 1, 12],
    [12, 1, 0],
    [9, -1, 21],
    [9, 2, 9],
    [9, 0, 9],
  ])('moves the meridiem from hour %i by %i to hour %i', (h, delta, expected) => {
    expect(stepSegment(t(h, 30, 15), 'meridiem', delta, 1)).toEqual(t(expected, 30, 15));
  });

  it('returns a new object rather than editing the value it was given', () => {
    const before = t(9, 59, 0);
    const after = stepSegment(before, 'minute', 1, 1);
    expect(before).toEqual(t(9, 59, 0));
    expect(after).not.toBe(before);
  });
});

describe('withinTimeRange', () => {
  it.each<[string, TimeParts]>([
    ['00:00', t(0, 0)],
    ['12:00', t(12, 0)],
    ['23:59:59', t(23, 59, 59)],
  ])('accepts %s when neither bound is set', (_label, p) => {
    expect(withinTimeRange(p, null, null)).toBe(true);
  });

  it.each<[TimeParts, boolean]>([
    [t(8, 59, 59), false],
    [t(9, 0), true],
    [t(12, 0), true],
    [t(17, 0), true],
    [t(17, 0, 1), false],
  ])('treats the 09:00 to 17:00 bounds as inclusive for %o', (p, expected) => {
    expect(withinTimeRange(p, t(9, 0), t(17, 0))).toBe(expected);
  });

  it.each<[TimeParts, boolean]>([
    [t(23, 0), true],
    [t(2, 0), true],
    [t(22, 0), true],
    [t(6, 0), true],
    [t(0, 0), true],
    [t(12, 0), false],
    [t(21, 59), false],
    [t(6, 0, 1), false],
  ])('reads the overnight window 22:00 to 06:00 as a disjunction for %o', (p, expected) => {
    expect(withinTimeRange(p, t(22, 0), t(6, 0))).toBe(expected);
  });

  it.each<[TimeParts, boolean]>([
    [t(9, 29), false],
    [t(9, 30), true],
    [t(23, 59), true],
  ])('checks a lone min of 09:30 against %o', (p, expected) => {
    expect(withinTimeRange(p, t(9, 30), null)).toBe(expected);
  });

  it.each<[TimeParts, boolean]>([
    [t(0, 0), true],
    [t(17, 0), true],
    [t(17, 0, 1), false],
  ])('checks a lone max of 17:00 against %o', (p, expected) => {
    expect(withinTimeRange(p, null, t(17, 0))).toBe(expected);
  });
});

describe('clampTime', () => {
  it('leaves 10:15 alone under a min of 09:30 rather than clamping the minute', () => {
    expect(clampTime(t(10, 15), t(9, 30), null)).toEqual(t(10, 15));
  });

  it('pushes 09:00 up to a min of 09:30', () => {
    expect(clampTime(t(9, 0), t(9, 30), null)).toEqual(t(9, 30));
  });

  it.each<[TimeParts, TimeParts | null, TimeParts | null, TimeParts]>([
    [t(12, 0), null, null, t(12, 0)],
    [t(8, 0), t(9, 30), t(17, 0), t(9, 30)],
    [t(10, 15), t(9, 30), t(17, 0), t(10, 15)],
    [t(18, 45), t(9, 30), t(17, 0), t(17, 0)],
    [t(17, 0), t(9, 30), t(17, 0), t(17, 0)],
    [t(23, 30), null, t(17, 0), t(17, 0)],
    [t(16, 59, 59), null, t(17, 0), t(16, 59, 59)],
  ])('clamps %o between %o and %o to %o', (p, min, max, expected) => {
    expect(clampTime(p, min, max)).toEqual(expected);
  });

  it.each<[TimeParts, TimeParts]>([
    [t(23, 0), t(23, 0)],
    [t(2, 0), t(2, 0)],
    [t(12, 0), t(6, 0)],
    [t(20, 0), t(22, 0)],
    [t(6, 30), t(6, 0)],
    [t(21, 30), t(22, 0)],
  ])('clamps %o into the overnight window 22:00 to 06:00 as %o', (p, expected) => {
    expect(clampTime(p, t(22, 0), t(6, 0))).toEqual(expected);
  });

  it('moves an exactly equidistant time back to the max end of an overnight window', () => {
    // The excluded window is 06:00 to 18:00, so noon sits six hours from each end.
    expect(clampTime(t(12, 0), t(18, 0), t(6, 0))).toEqual(t(6, 0));
  });

  it.each<[TimeParts, TimeParts | null, TimeParts | null]>([
    [t(12, 0), t(9, 30), t(17, 0)],
    [t(8, 0), t(9, 30), null],
    [t(23, 0), t(22, 0), t(6, 0)],
  ])('returns a time that its own range accepts for %o', (p, min, max) => {
    expect(withinTimeRange(clampTime(p, min, max), min, max)).toBe(true);
  });
});

describe('to12Hour', () => {
  it.each<[number, number, 'AM' | 'PM']>([
    [0, 12, 'AM'],
    [1, 1, 'AM'],
    [11, 11, 'AM'],
    [12, 12, 'PM'],
    [13, 1, 'PM'],
    [23, 11, 'PM'],
  ])('reads hour %i as %i %s', (h, hour, meridiem) => {
    expect(to12Hour(h)).toEqual({ hour, meridiem });
  });

  it.each(HOURS)('never shows hour zero for %i', (h) => {
    const { hour } = to12Hour(h);
    expect(hour).toBeGreaterThanOrEqual(1);
    expect(hour).toBeLessThanOrEqual(12);
  });
});

describe('from12Hour', () => {
  it.each<[number, 'AM' | 'PM', number]>([
    [12, 'AM', 0],
    [1, 'AM', 1],
    [11, 'AM', 11],
    [12, 'PM', 12],
    [1, 'PM', 13],
    [11, 'PM', 23],
  ])('reads %i %s as hour %i', (hour, meridiem, expected) => {
    expect(from12Hour(hour, meridiem)).toBe(expected);
  });

  it.each(HOURS)('round-trips hour %i through the 12-hour display', (h) => {
    const { hour, meridiem } = to12Hour(h);
    expect(from12Hour(hour, meridiem)).toBe(h);
  });
});

describe('pad2', () => {
  it.each<[number, string]>([
    [0, '00'],
    [5, '05'],
    [9, '09'],
    [10, '10'],
    [15, '15'],
    [59, '59'],
  ])('pads %i as %s', (n, expected) => {
    expect(pad2(n)).toBe(expected);
  });
});
