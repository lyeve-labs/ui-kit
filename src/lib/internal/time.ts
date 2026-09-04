/**
 * The arithmetic behind TimePicker's hour, minute and optional second segments.
 *
 * The value the field reads and writes is RFC 3339 partial-time with no
 * fraction:
 *
 *     unset            ''
 *     seconds: false   /^([01]\d|2[0-3]):([0-5]\d)$/            for example '09:30'
 *     seconds: true    /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/  for example '09:30:15'
 *
 * 24-hour, zero padded, no offset, no fractional seconds, no '24:00', no ':60'.
 *
 * Every helper here is a step a component author gets wrong on the first
 * attempt: hours that carry when the arrow key promised one segment, a range
 * check that cannot express an overnight window, per-segment clamping that
 * rewrites a legal time, and a modulo that turns midnight into hour zero of a
 * clock with no hour zero.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/** One time, already range checked. `mi` rather than `m` so it cannot read as months. */
export interface TimeParts {
  h: number;
  mi: number;
  s: number;
}

/** The parts of the field an arrow key can land on. `meridiem` exists only in 12-hour display. */
export type TimeSegment = 'hour' | 'minute' | 'second' | 'meridiem';

/** Highest legal value plus one, per stepped segment. */
const SEGMENT_SIZE: Record<Exclude<TimeSegment, 'meridiem'>, number> = {
  hour: 24,
  minute: 60,
  second: 60,
};

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** The whole time as one number, so a comparison cannot compare the minute first. */
function secondsOf(p: TimeParts): number {
  return p.h * SECONDS_PER_HOUR + p.mi * SECONDS_PER_MINUTE + p.s;
}

/**
 * The segments are fixed width and the third is optional, which is the whole
 * grammar. Anchored at both ends so a trailing offset or a fraction fails.
 */
const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/**
 * Range-checks rather than wrapping: '24:00' and '00:60' return null, not a
 * rolled-over value.
 *
 * Parsing through Date was the first attempt and it accepts both, because
 * '1970-01-01T24:00' is the following midnight. A picker fed that displayed
 * 00:00 for a string the server had already rejected. A single unpadded digit
 * such as '9:30' is rejected for the same reason: the segments are fixed width,
 * and accepting a short one lets a keystroke part way through an entry read as
 * a committed value.
 */
export function parseISOTime(s: string | undefined | null): TimeParts | null {
  if (typeof s !== 'string') return null;
  const m = ISO_TIME.exec(s);
  if (!m) return null;
  const sec = m[3];
  return { h: Number(m[1]), mi: Number(m[2]), s: sec ? Number(sec) : 0 };
}

/**
 * Writes a time back in the one format the field accepts.
 *
 * `seconds` decides whether the third segment is written at all. A picker with
 * no second segment that emits '09:30:00' round-trips a field the user cannot
 * see and can never correct.
 */
export function toISOTime(p: TimeParts, seconds: boolean): string {
  const base = `${pad2(p.h)}:${pad2(p.mi)}`;
  return seconds ? `${base}:${pad2(p.s)}` : base;
}

/**
 * Steps one segment without carrying into its neighbour. Stepping the minute
 * past 59 wraps to 0 and leaves the hour alone, because a spinner that changes
 * two fields at once is not what the arrow key promised.
 *
 * A step that does not divide its segment lands on the far end rather than
 * carrying the remainder: the minute 59 with step 15 goes to 0, not to 14, and
 * stepping down from 0 goes to 59, not to 45. The remainder is a value the user
 * cannot predict from the key they pressed.
 *
 * `meridiem` has two values, so it ignores `step` and moves the hour by twelve
 * once per unit of delta. An even delta lands back where it started.
 */
export function stepSegment(
  p: TimeParts,
  segment: TimeSegment,
  delta: number,
  step: number,
): TimeParts {
  if (segment === 'meridiem') {
    const flips = Math.abs(Math.trunc(delta)) % 2;
    return { ...p, h: (p.h + 12 * flips) % SEGMENT_SIZE.hour };
  }

  const size = SEGMENT_SIZE[segment];
  const current = segment === 'hour' ? p.h : segment === 'minute' ? p.mi : p.s;
  const next = current + delta * step;
  const moved = next > size - 1 ? 0 : next < 0 ? size - 1 : next;

  if (segment === 'hour') return { ...p, h: moved };
  if (segment === 'minute') return { ...p, mi: moved };
  return { ...p, s: moved };
}

/**
 * Inclusive bounds. A range whose min is greater than its max wraps past
 * midnight and is a legal way to say "overnight", so the check is a disjunction
 * rather than a conjunction in that case.
 *
 * The conjunction alone makes 22:00 to 06:00 match nothing, and a night shift
 * picker built on it rejected every time a user could enter.
 */
export function withinTimeRange(
  p: TimeParts,
  min: TimeParts | null,
  max: TimeParts | null,
): boolean {
  const t = secondsOf(p);
  if (min !== null && max !== null) {
    const lo = secondsOf(min);
    const hi = secondsOf(max);
    return lo > hi ? t >= lo || t <= hi : t >= lo && t <= hi;
  }
  if (min !== null) return t >= secondsOf(min);
  if (max !== null) return t <= secondsOf(max);
  return true;
}

/**
 * Clamps a whole time to the bounds. Clamping per segment is wrong: with min
 * 09:30, the time 10:15 is legal and per-segment clamping would push its minute
 * to 30.
 *
 * When the range wraps past midnight the excluded window is the gap between max
 * and min, so a time inside it moves to whichever end is nearer around the
 * clock. A tie moves back to max, because the user was on the earlier side of
 * the window before the step that left it.
 */
export function clampTime(p: TimeParts, min: TimeParts | null, max: TimeParts | null): TimeParts {
  if (withinTimeRange(p, min, max)) return p;

  if (min !== null && max !== null && secondsOf(min) > secondsOf(max)) {
    const t = secondsOf(p);
    return t - secondsOf(max) <= secondsOf(min) - t ? max : min;
  }

  if (min !== null && secondsOf(p) < secondsOf(min)) return min;
  if (max !== null && secondsOf(p) > secondsOf(max)) return max;
  return p;
}

/**
 * 24-hour to 12-hour display, returning the hour and the meridiem. Midnight is
 * 12 AM and noon is 12 PM, which is where the naive modulo gets it wrong: it
 * gives 0 for both, and a picker showing '0:00 AM' has invented an hour zero
 * that no 12-hour clock has.
 */
export function to12Hour(h: number): { hour: number; meridiem: 'AM' | 'PM' } {
  const wrapped = h % 12;
  return { hour: wrapped === 0 ? 12 : wrapped, meridiem: h < 12 ? 'AM' : 'PM' };
}

/**
 * 12-hour back to 24. 12 AM is hour 0 and 12 PM is hour 12; every other hour is
 * itself in the morning and itself plus twelve in the afternoon.
 */
export function from12Hour(hour: number, meridiem: 'AM' | 'PM'): number {
  const base = hour % 12;
  return meridiem === 'PM' ? base + 12 : base;
}

/**
 * Zero-pads a segment for display. A minute of 5 written straight into the
 * value gives '09:5', which parseISOTime then rejects, so the field drops the
 * time the user just picked and blanks itself.
 */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
