import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  addMonths,
  compareDates,
  daysInMonth,
  firstWeekday,
  monthGrid,
  parseISODate,
  toISODate,
  todayLocal,
  withinRange,
} from './calendar.js';
import type { CalendarDate } from './calendar.js';

/**
 * The module answers questions a Date answers too, and answers them differently
 * on purpose. So the tests below check the traps rather than the happy path:
 * the day a Date rolls into the next month, the century a two digit year lands
 * in, the zone a parsed string is read in, and the row a short month drops.
 *
 * Where a Date is a correct independent oracle it is used as one. A test may
 * call Date; the module may not, and the last suite reads the module's own
 * source to keep it that way.
 */

const DAY_MS = 86_400_000;

/** Parses a fixture, refusing to let a typo in a table become a passing test. */
function date(iso: string): CalendarDate {
  const parsed = parseISODate(iso);
  if (parsed === null) throw new Error(`test fixture is not a date: ${iso}`);
  return parsed;
}

/** Splits a fixture without going through the module under test. */
function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/**
 * The UTC millisecond for a calendar date, which the oracles below build on.
 *
 * UTC throughout, so no zone the test runs in can shift an answer. Date.UTC
 * applies the same two digit year remap as the constructor, so a year under 100
 * is set afterwards through setUTCFullYear, which does not remap.
 */
function utcMs(d: { y: number; m: number; d: number }): number {
  if (d.y >= 100) return Date.UTC(d.y, d.m - 1, d.d);
  const at = new Date(Date.UTC(2000, d.m - 1, d.d));
  at.setUTCFullYear(d.y);
  return at.getTime();
}

/** Independent oracle: the same date reached through UTC milliseconds. */
function oracleAddDays(iso: string, delta: number): string {
  const at = new Date(utcMs(parts(iso)) + delta * DAY_MS);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${String(at.getUTCFullYear()).padStart(4, '0')}-${pad2(at.getUTCMonth() + 1)}-${pad2(at.getUTCDate())}`;
}

/** Independent oracle for the weekday of a date, 0 for Sunday. */
function oracleWeekday(d: CalendarDate): number {
  return new Date(utcMs(d)).getUTCDay();
}

describe('parseISODate', () => {
  const CASES: { label: string; input: string | undefined | null; want: CalendarDate | null }[] = [
    {
      label: '2024-02-29 is a date, 2024 is a leap year',
      input: '2024-02-29',
      want: { y: 2024, m: 2, d: 29 },
    },
    { label: '2023-02-29 is not a date, 2023 is not a leap year', input: '2023-02-29', want: null },
    {
      label: '2000-02-29 is a date, 2000 divides by 400',
      input: '2000-02-29',
      want: { y: 2000, m: 2, d: 29 },
    },
    { label: '1900-02-29 is not a date, 1900 is a century', input: '1900-02-29', want: null },
    { label: '2024-02-30 is a day February never has', input: '2024-02-30', want: null },
    { label: '2024-04-31 is a day April never has', input: '2024-04-31', want: null },
    { label: '2024-13-01 is a month that does not exist', input: '2024-13-01', want: null },
    { label: '2024-00-10 is a month that does not exist', input: '2024-00-10', want: null },
    { label: '2024-13-45 does not become 2025-02-14', input: '2024-13-45', want: null },
    { label: '2024-01-00 is a day that does not exist', input: '2024-01-00', want: null },
    { label: '2024-1-1 is not padded', input: '2024-1-1', want: null },
    { label: '20240101 has no separators', input: '20240101', want: null },
    { label: 'the empty string is an unset field', input: '', want: null },
    { label: 'undefined is an unset field', input: undefined, want: null },
    { label: 'null is an unset field', input: null, want: null },
    { label: '2024-01-31T00:00 carries a time', input: '2024-01-31T00:00', want: null },
    { label: ' 2024-01-31 is padded with a space', input: ' 2024-01-31', want: null },
    { label: '2024-01-31 is a date', input: '2024-01-31', want: { y: 2024, m: 1, d: 31 } },
    { label: '2024-12-31 is a date', input: '2024-12-31', want: { y: 2024, m: 12, d: 31 } },
    { label: '0024-01-01 keeps its own century', input: '0024-01-01', want: { y: 24, m: 1, d: 1 } },
  ];

  it.each(CASES)('$label', ({ input, want }) => {
    expect(parseISODate(input)).toEqual(want);
  });

  it.each(CASES.filter((c) => c.want !== null))('$label, and it round trips', ({ input, want }) => {
    if (want === null || typeof input !== 'string') throw new Error('filtered case is not a date');
    expect(toISODate(want)).toBe(input);
  });
});

describe('toISODate', () => {
  const CASES: { label: string; input: CalendarDate; want: string }[] = [
    { label: 'pads the month and the day', input: { y: 2024, m: 1, d: 5 }, want: '2024-01-05' },
    { label: 'pads a year under 1000', input: { y: 24, m: 1, d: 1 }, want: '0024-01-01' },
    {
      label: 'leaves a two digit month and day alone',
      input: { y: 2026, m: 12, d: 31 },
      want: '2026-12-31',
    },
  ];

  it.each(CASES)('$label', ({ input, want }) => {
    expect(toISODate(input)).toBe(want);
  });

  it('writes a spelling that sorts as text', () => {
    // DatePicker compares its min and max bounds as plain strings, which is
    // only correct while every part is zero padded.
    const sorted = ['2024-12-01', '2024-01-05', '2024-02-10']
      .map(date)
      .map(toISODate)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(sorted).toEqual(['2024-01-05', '2024-02-10', '2024-12-01']);
  });
});

describe('daysInMonth', () => {
  const FEBRUARY: { label: string; y: number; want: number }[] = [
    { label: '2000 is a leap year, it divides by 400', y: 2000, want: 29 },
    {
      label: '1900 is not a leap year, it is a century that does not divide by 400',
      y: 1900,
      want: 28,
    },
    { label: '2024 is a leap year', y: 2024, want: 29 },
    { label: '2023 is not a leap year', y: 2023, want: 28 },
    { label: '2100 is not a leap year', y: 2100, want: 28 },
    { label: '2400 is a leap year', y: 2400, want: 29 },
  ];

  it.each(FEBRUARY)('February $y: $label', ({ y, want }) => {
    expect(daysInMonth(y, 2)).toBe(want);
  });

  const MONTHS_2023 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  it.each(MONTHS_2023.map((want, i) => ({ m: i + 1, want })))(
    'month $m of 2023 has $want days',
    ({ m, want }) => {
      expect(daysInMonth(2023, m)).toBe(want);
    },
  );

  it.each([0, 13, -1, 1.5, Number.NaN])('month %s has no days', (m) => {
    // A month that does not exist has to bound every day out, or parseISODate
    // would accept a day inside it.
    expect(daysInMonth(2024, m)).toBe(0);
  });
});

describe('firstWeekday', () => {
  const CASES = [
    { y: 2024, m: 1 },
    { y: 2024, m: 2 },
    { y: 2024, m: 9 },
    { y: 2026, m: 1 },
    { y: 2026, m: 9 },
    { y: 1900, m: 3 },
    { y: 2000, m: 2 },
    { y: 2100, m: 12 },
  ];

  it.each(CASES)('the first of $m/$y matches UTC millisecond arithmetic', ({ y, m }) => {
    expect(firstWeekday(y, m)).toBe(oracleWeekday({ y, m, d: 1 }));
  });

  it('answers for a year the Date constructor would move to the twentieth century', () => {
    // new Date(24, 0, 1) is 1924, so a weekday read from the numeric Date
    // constructor is wrong for any year a four digit field can hold.
    expect(new Date(24, 0, 1).getFullYear()).toBe(1924);
    expect(firstWeekday(24, 1)).toBe(oracleWeekday({ y: 24, m: 1, d: 1 }));
    expect(firstWeekday(24, 1)).not.toBe(firstWeekday(1924, 1));
  });
});

describe('addMonths', () => {
  const CASES: { label: string; from: string; delta: number; want: string }[] = [
    {
      label: '31 January plus one month is 29 February in a leap year',
      from: '2024-01-31',
      delta: 1,
      want: '2024-02-29',
    },
    {
      label: '31 January plus one month is 28 February in a common year',
      from: '2023-01-31',
      delta: 1,
      want: '2023-02-28',
    },
    {
      label: '31 March minus one month is 29 February in a leap year',
      from: '2024-03-31',
      delta: -1,
      want: '2024-02-29',
    },
    {
      label: '31 March minus one month is 28 February in a common year',
      from: '2023-03-31',
      delta: -1,
      want: '2023-02-28',
    },
    { label: '31 May plus one month is 30 June', from: '2024-05-31', delta: 1, want: '2024-06-30' },
    {
      label: 'December plus one crosses the year forward',
      from: '2024-12-15',
      delta: 1,
      want: '2025-01-15',
    },
    {
      label: 'January minus one crosses the year back',
      from: '2024-01-15',
      delta: -1,
      want: '2023-12-15',
    },
    {
      label: 'December plus two crosses the year forward',
      from: '2024-12-31',
      delta: 2,
      want: '2025-02-28',
    },
    {
      label: 'twelve months forward is the same day next year',
      from: '2024-06-10',
      delta: 12,
      want: '2025-06-10',
    },
    {
      label: 'eighteen months back crosses two year boundaries',
      from: '2024-06-10',
      delta: -18,
      want: '2022-12-10',
    },
    {
      label: 'twelve months from 29 February clamps',
      from: '2024-02-29',
      delta: 12,
      want: '2025-02-28',
    },
    { label: 'a delta of zero is the same date', from: '2024-01-31', delta: 0, want: '2024-01-31' },
  ];

  it.each(CASES)('$label', ({ from, delta, want }) => {
    expect(toISODate(addMonths(date(from), delta))).toBe(want);
  });

  it('never rolls a clamped day into the following month', () => {
    // A Date rolls: 31 January plus a month is 2 or 3 March, which is the
    // month the picker would then be showing.
    const rolled = new Date(2024, 1, 31);
    expect(rolled.getMonth()).toBe(2);
    expect(toISODate(addMonths(date('2024-01-31'), 1))).toBe('2024-02-29');
  });

  it('lands in the viewed month for every day of a long month', () => {
    for (let d = 1; d <= 31; d++) {
      const moved = addMonths({ y: 2023, m: 1, d }, 1);
      expect(moved.m).toBe(2);
      expect(moved.y).toBe(2023);
      expect(moved.d).toBeLessThanOrEqual(28);
    }
  });
});

describe('addDays', () => {
  const CASES: { label: string; from: string; delta: number; want: string }[] = [
    { label: 'steps onto the leap day', from: '2024-02-28', delta: 1, want: '2024-02-29' },
    { label: 'steps over the leap day', from: '2024-02-28', delta: 2, want: '2024-03-01' },
    { label: 'steps back onto the leap day', from: '2024-03-01', delta: -1, want: '2024-02-29' },
    {
      label: 'skips the leap day a common year does not have',
      from: '2023-02-28',
      delta: 1,
      want: '2023-03-01',
    },
    { label: 'crosses the year forward', from: '2024-12-31', delta: 1, want: '2025-01-01' },
    { label: 'crosses the year back', from: '2025-01-01', delta: -1, want: '2024-12-31' },
    { label: 'a leap year is 366 days long', from: '2024-01-01', delta: 366, want: '2025-01-01' },
    { label: 'a common year is 365 days long', from: '2023-01-01', delta: 365, want: '2024-01-01' },
    {
      label: 'a large delta crosses many years forward',
      from: '2000-01-01',
      delta: 10000,
      want: '2027-05-19',
    },
    {
      label: 'a large delta crosses many years back',
      from: '2024-06-15',
      delta: -5000,
      want: '2010-10-07',
    },
    { label: 'a delta of zero is the same date', from: '2026-09-04', delta: 0, want: '2026-09-04' },
  ];

  it.each(CASES)('$label', ({ from, delta, want }) => {
    expect(toISODate(addDays(date(from), delta))).toBe(want);
  });

  const BASES = [
    '1970-01-01',
    '1999-12-31',
    '2000-02-28',
    '2024-02-29',
    '2026-09-04',
    '2100-03-01',
  ];
  const DELTAS = [-10000, -400, -366, -31, -1, 0, 1, 28, 31, 365, 366, 10000];
  const SWEEP = BASES.flatMap((from) => DELTAS.map((delta) => ({ from, delta })));

  it.each(SWEEP)('$from plus $delta days matches UTC millisecond arithmetic', ({ from, delta }) => {
    expect(toISODate(addDays(date(from), delta))).toBe(oracleAddDays(from, delta));
  });

  it('is its own inverse', () => {
    const start = date('2024-02-29');
    expect(toISODate(addDays(addDays(start, 4013), -4013))).toBe('2024-02-29');
  });
});

describe('compareDates', () => {
  const A = date('2024-02-29');
  const SAMPLE = ['2023-12-31', '2024-01-01', '2024-02-29', '2024-03-01', '2025-01-01'].map(date);

  const CASES: { label: string; a: string; b: string; want: number }[] = [
    { label: 'an earlier year is before', a: '2023-06-01', b: '2024-06-01', want: -1 },
    { label: 'a later year is after', a: '2025-06-01', b: '2024-06-01', want: 1 },
    { label: 'an earlier month is before', a: '2024-05-31', b: '2024-06-01', want: -1 },
    { label: 'an earlier day is before', a: '2024-06-01', b: '2024-06-02', want: -1 },
    { label: 'the same date is equal', a: '2024-06-01', b: '2024-06-01', want: 0 },
  ];

  it.each(CASES)('$label', ({ a, b, want }) => {
    expect(compareDates(date(a), date(b))).toBe(want);
  });

  it('returns only -1, 0 or 1, never the difference between the fields', () => {
    // Two years apart is 1, not 2. A caller testing for 1 has to keep working
    // as the gap widens.
    expect(compareDates(date('2026-01-01'), date('2024-01-01'))).toBe(1);
    expect(compareDates(date('2024-01-01'), date('2026-01-01'))).toBe(-1);
  });

  it('sorts a shuffled list into date order', () => {
    const shuffled = ['2025-01-01', '2024-02-29', '2023-12-31', '2024-03-01', '2024-01-01'].map(
      date,
    );
    const sorted = [...shuffled].sort(compareDates).map(toISODate);
    expect(sorted).toEqual(['2023-12-31', '2024-01-01', '2024-02-29', '2024-03-01', '2025-01-01']);
  });

  it('is antisymmetric and reflexive over every pair', () => {
    for (const a of SAMPLE) {
      expect(compareDates(a, a)).toBe(0);
      for (const b of SAMPLE) {
        // Stated as a sum rather than a negation: negating a returned 0 gives
        // -0, which toBe compares with Object.is and rejects.
        expect(compareDates(a, b) + compareDates(b, a)).toBe(0);
        expect([-1, 0, 1]).toContain(compareDates(a, b));
      }
    }
  });

  it('is transitive over every triple', () => {
    for (const a of SAMPLE) {
      for (const b of SAMPLE) {
        for (const c of SAMPLE) {
          if (compareDates(a, b) <= 0 && compareDates(b, c) <= 0) {
            expect(compareDates(a, c)).toBeLessThanOrEqual(0);
          }
        }
      }
    }
    expect(compareDates(A, A)).toBe(0);
  });
});

describe('withinRange', () => {
  const MIN = date('2024-06-01');
  const MAX = date('2024-06-30');

  const CASES: {
    label: string;
    d: string;
    min: CalendarDate | null;
    max: CalendarDate | null;
    want: boolean;
  }[] = [
    { label: 'inside both bounds', d: '2024-06-15', min: MIN, max: MAX, want: true },
    {
      label: 'on the lower bound, which is inclusive',
      d: '2024-06-01',
      min: MIN,
      max: MAX,
      want: true,
    },
    {
      label: 'on the upper bound, which is inclusive',
      d: '2024-06-30',
      min: MIN,
      max: MAX,
      want: true,
    },
    { label: 'one day under the lower bound', d: '2024-05-31', min: MIN, max: MAX, want: false },
    { label: 'one day over the upper bound', d: '2024-07-01', min: MIN, max: MAX, want: false },
    { label: 'a null lower bound is unbounded', d: '1970-01-01', min: null, max: MAX, want: true },
    { label: 'a null upper bound is unbounded', d: '2999-12-31', min: MIN, max: null, want: true },
    { label: 'two null bounds accept anything', d: '2024-06-15', min: null, max: null, want: true },
    {
      label: 'a null upper bound still respects the lower one',
      d: '2024-05-31',
      min: MIN,
      max: null,
      want: false,
    },
    {
      label: 'a null lower bound still respects the upper one',
      d: '2024-07-01',
      min: null,
      max: MAX,
      want: false,
    },
  ];

  it.each(CASES)('$label', ({ d, min, max, want }) => {
    expect(withinRange(date(d), min, max)).toBe(want);
  });

  it('offers the single day a min and max pinned to the same date allow', () => {
    const only = date('2024-06-15');
    expect(withinRange(only, only, only)).toBe(true);
  });
});

describe('monthGrid', () => {
  const MONTHS = [
    { y: 2024, m: 2 },
    { y: 2021, m: 2 },
    { y: 2026, m: 2 },
    { y: 2024, m: 6 },
    { y: 2023, m: 12 },
    { y: 2024, m: 1 },
    { y: 2000, m: 2 },
    { y: 1900, m: 2 },
    { y: 2026, m: 9 },
  ];
  const STARTS: (0 | 1)[] = [0, 1];
  const CASES = MONTHS.flatMap((month) =>
    STARTS.map((weekStartsOn) => ({ ...month, weekStartsOn })),
  );

  it.each(CASES)('$m/$y from weekday $weekStartsOn is 42 cells', ({ y, m, weekStartsOn }) => {
    // Fixed at 42 so the popover keeps its height as the user pages through
    // the year. A grid that stops at the last day is four rows for a short
    // February and six for a long month, and the day under the pointer moves.
    expect(monthGrid(y, m, weekStartsOn)).toHaveLength(42);
  });

  it.each(CASES)('$m/$y starts on weekday $weekStartsOn', ({ y, m, weekStartsOn }) => {
    const first = monthGrid(y, m, weekStartsOn)[0];
    expect(oracleWeekday(first.date)).toBe(weekStartsOn);
  });

  it.each(CASES)('$m/$y holds exactly its own days', ({ y, m, weekStartsOn }) => {
    const inside = monthGrid(y, m, weekStartsOn).filter((cell) => !cell.outside);
    expect(inside).toHaveLength(daysInMonth(y, m));
    expect(inside.map((cell) => cell.date.d)).toEqual(
      Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1),
    );
    for (const cell of inside) {
      expect(cell.date.y).toBe(y);
      expect(cell.date.m).toBe(m);
    }
  });

  it.each(CASES)('$m/$y runs 42 consecutive days', ({ y, m, weekStartsOn }) => {
    const cells = monthGrid(y, m, weekStartsOn);
    for (let i = 1; i < cells.length; i++) {
      expect(toISODate(cells[i].date)).toBe(oracleAddDays(toISODate(cells[i - 1].date), 1));
    }
  });

  it.each(CASES)('$m/$y marks every cell outside the month', ({ y, m, weekStartsOn }) => {
    for (const cell of monthGrid(y, m, weekStartsOn)) {
      expect(cell.outside).toBe(cell.date.y !== y || cell.date.m !== m);
    }
  });

  it('defaults to a week that starts on Sunday, which is what DatePicker labels', () => {
    const first = monthGrid(2026, 9)[0];
    expect(oracleWeekday(first.date)).toBe(0);
  });
});

describe('todayLocal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the date on the wall behind the viewer, not the UTC date', () => {
    // The hour is chosen so the instant falls on a different UTC day than the
    // local one wherever the test runs, which is what a toISOString based
    // implementation would return. On a runner already at UTC no hour can
    // diverge, and the source suite below covers that case instead.
    const offsetMinutes = new Date(2026, 0, 2).getTimezoneOffset();
    const hour = offsetMinutes > 0 ? 23 : offsetMinutes < 0 ? 0 : 12;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, hour, 30));

    expect(todayLocal()).toEqual({ y: 2026, m: 1, d: 2 });
  });

  it('reports a date the rest of the module accepts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 12, 0));

    const today = todayLocal();
    expect(parseISODate(toISODate(today))).toEqual(today);
    expect(toISODate(today)).toBe('2026-09-04');
  });

  it('gives the month a human says, not the zero based one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0));

    expect(todayLocal().m).toBe(1);
  });
});

describe('the module never hands a string to the Date parser', () => {
  const SOURCE = readFileSync(join(__dirname, 'calendar.ts'), 'utf8');

  /**
   * Comments are stripped first. The header states the rule by quoting the
   * call it forbids, and a check that could not tell prose from code would
   * either fail on the statement of the rule or force the rule out of the file.
   */
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('states the rule at the top of the file', () => {
    // Comment markers and wrapping are flattened first, so reflowing the header
    // does not fail the check and deleting the rule still does.
    const prose = SOURCE.replace(/\n\s*\*/g, ' ').replace(/\s+/g, ' ');
    expect(prose).toContain('no string is ever handed to the Date parser');
  });

  it('constructs a Date only with no arguments', () => {
    // new Date('2026-01-02') is UTC midnight and new Date('2026-01-02T00:00')
    // is local midnight, so one helper over a date field and a datetime field
    // lands in two zones. The numeric constructor is out too: new Date(24,0,1)
    // is 1924.
    expect(CODE.match(/new Date\s*\(\s*[^)\s]/)).toBeNull();
  });

  it('reads the clock exactly once', () => {
    const clockReads = CODE.match(/new Date\s*\(\s*\)/g) ?? [];
    expect(clockReads).toHaveLength(1);
  });

  it.each([
    'Date.parse',
    'Date.UTC',
    'toISOString',
    'toJSON',
    'getTimezoneOffset',
    'toLocaleDateString',
  ])('never calls %s', (forbidden) => {
    expect(CODE).not.toContain(forbidden);
  });

  it('keeps the clock read inside todayLocal', () => {
    // Any other function reading the clock would make its answer depend on when
    // it is called, which is what makes a calendar bug reproduce only overnight.
    const todayBody = /export function todayLocal\(\): CalendarDate \{([\s\S]*?)\n\}/.exec(CODE);
    expect(todayBody).not.toBeNull();
    if (todayBody === null) return;
    expect(todayBody[1]).toContain('new Date()');
    expect(CODE.replace(todayBody[0], '')).not.toContain('new Date');
  });
});
