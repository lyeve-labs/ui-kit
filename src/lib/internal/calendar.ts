/**
 * Month arithmetic for the date controls, done without the Date parser.
 *
 * The rule this module exists to enforce: no string is ever handed to the Date
 * parser. `new Date('2026-01-02')` is UTC midnight by specification and
 * `new Date('2026-01-02T00:00')` is local midnight, so one helper applied to a
 * date field and to a datetime field lands in two different zones. Read the
 * first form back through the local getters west of UTC and it is 1 January.
 * That is the off by one day, and it appears only for the part of the world
 * that is not on UTC, which is why it survives a developer's own testing.
 *
 * DatePicker binds `value` to an ISO calendar date spelled `YYYY-MM-DD`: four
 * digit year, two digit zero padded month, two digit zero padded day, with the
 * empty string standing for no date. Its `min` and `max` props take the same
 * spelling and are compared as plain strings, which works only because that
 * spelling sorts lexicographically. DateRangePicker and DateTimePicker will
 * carry the same value and need the same arithmetic, and each of the three is a
 * place the zone bug enters, so the arithmetic is stated once here.
 *
 * The numeric Date constructor is avoided as well. `new Date(24, 0, 1)` is
 * 1924, because the constructor remaps years 0 through 99 into the twentieth
 * century, and the year in a date field comes from a user. Everything below is
 * integer arithmetic on the proleptic Gregorian calendar. The one Date in the
 * file is the no argument one inside todayLocal, which is the only place a real
 * clock is needed.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/** A calendar date with no zone and no time. m is 1-12, the month a human says, not the 0-11 the Date constructor takes. */
export interface CalendarDate {
  y: number;
  m: number;
  d: number;
}

/** Month lengths in a common year. February is corrected for leap years in daysInMonth. */
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The only spelling DatePicker reads or writes. Anything else is not a date. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The full Gregorian rule, not the every fourth year shorthand.
 *
 * A century is a common year unless it divides by 400. Dropping that clause
 * makes 2000 a common year and puts 29 February 2000 out of reach of the
 * control; keeping only the century clause makes 1900 a leap year and invents a
 * day nobody lived through.
 */
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** The remainder operator keeps the sign of its left operand, so a negative weekday offset needs the extra turn. */
function mod7(n: number): number {
  return ((n % 7) + 7) % 7;
}

/**
 * Days from 1970-01-01, negative before it.
 *
 * Howard Hinnant's days_from_civil, which is exact for every year the
 * arithmetic can express and never touches a Date. Counting days is what makes
 * addDays a single addition rather than a carry the caller has to write across
 * three fields, and it is what gives firstWeekday an answer for a year under
 * 100, where the Date constructor gives the wrong century.
 */
function toDayNumber(date: CalendarDate): number {
  const shiftedYear = date.y - (date.m <= 2 ? 1 : 0);
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const dayOfYear = Math.floor((153 * (date.m + (date.m > 2 ? -3 : 9)) + 2) / 5) + date.d - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/** The inverse of toDayNumber, so a day count can go back to a date the grid can render. */
function fromDayNumber(dayNumber: number): CalendarDate {
  const shifted = dayNumber + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153);
  const d = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
  const m = monthIndex + (monthIndex < 10 ? 3 : -9);
  return { y: yearOfEra + era * 400 + (m <= 2 ? 1 : 0), m, d };
}

/**
 * Reads the `YYYY-MM-DD` DatePicker binds, or null when the string is not one.
 *
 * Shape checks and round trips. `2024-13-45` returns null rather than silently
 * becoming the 2025-02-14 those three numbers normalize to in a Date: a picker
 * that accepted it would open on a month the user never typed and report a
 * value they never chose. A day is rejected when its month does not have it, so
 * `2024-02-30` and `2023-02-29` are both null while `2024-02-29` is a date.
 * Undefined and the empty string are null too, because an unset field is the
 * ordinary state of a date input and not an error.
 */
export function parseISODate(s: string | undefined | null): CalendarDate | null {
  if (!s) return null;
  const parts = ISO_DATE.exec(s);
  if (!parts) return null;
  const y = Number(parts[1]);
  const m = Number(parts[2]);
  const d = Number(parts[3]);
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

/** Pads a number to a fixed width so the result sorts as text. */
function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/**
 * Writes the `YYYY-MM-DD` DatePicker binds.
 *
 * Every part is zero padded, including the year, because the min and max
 * comparison in the control is a string comparison: an unpadded `2024-1-5`
 * sorts after `2024-12-01` and the bound then rejects dates inside it.
 */
export function toISODate(date: CalendarDate): string {
  return `${pad(date.y, 4)}-${pad(date.m, 2)}-${pad(date.d, 2)}`;
}

/**
 * Today in the viewer's own zone, read from the Date's local getters and never
 * from its ISO string.
 *
 * `new Date().toISOString().slice(0, 10)` is the tempting one line version and
 * it is wrong: it converts to UTC first, so a viewer in Jakarta gets yesterday
 * until 7am and a viewer in New York gets tomorrow from the evening on. The
 * date the calendar marks as today has to be the date on the wall behind the
 * viewer.
 */
export function todayLocal(): CalendarDate {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/**
 * Days in a month, leap years included.
 *
 * A month outside 1 to 12 has no days and returns 0, so a caller bounding a day
 * against it rejects the month rather than accepting a day in a month that does
 * not exist.
 */
export function daysInMonth(y: number, m: number): number {
  if (!Number.isInteger(m) || m < 1 || m > 12) return 0;
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return MONTH_LENGTHS[m - 1];
}

/** Weekday of the first of the month, 0 for Sunday. */
export function firstWeekday(y: number, m: number): number {
  // Day number 0 is 1970-01-01, which was a Thursday, so the count starts four
  // weekdays into the week.
  return mod7(toDayNumber({ y, m, d: 1 }) + 4);
}

/**
 * Adds months, clamping the day rather than rolling into the next month.
 *
 * 31 January plus one month is 28 or 29 February, never 2 or 3 March. A Date
 * rolls, so paging a picker forward from the 31st and back again lands the user
 * on a different day than the one they were looking at, and a range whose start
 * was the 31st can end up after its own end.
 */
export function addMonths(date: CalendarDate, delta: number): CalendarDate {
  const totalMonths = date.y * 12 + (date.m - 1) + delta;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths - y * 12 + 1;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

/** Adds days across month and year boundaries, leap days included. */
export function addDays(date: CalendarDate, delta: number): CalendarDate {
  return fromDayNumber(toDayNumber(date) + delta);
}

/**
 * Orders two dates as -1, 0 or 1.
 *
 * A total order, so a caller can sort and bound without constructing a Date.
 * Returning the field difference would sort just as well and would report 2 for
 * two years apart, which quietly breaks the caller that tests for 1.
 */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

/**
 * Inclusive on both ends. Either bound may be null, meaning unbounded.
 *
 * Inclusive because a picker given min and max for a single allowed day has to
 * offer that day. DatePicker compares its bounds as strings today, which agrees
 * with this only while every bound is zero padded.
 */
export function withinRange(
  date: CalendarDate,
  min: CalendarDate | null,
  max: CalendarDate | null,
): boolean {
  if (min !== null && compareDates(date, min) < 0) return false;
  if (max !== null && compareDates(date, max) > 0) return false;
  return true;
}

/**
 * The six week grid a month renders, always 42 cells so the calendar does not
 * change height between months. Cells outside the viewed month carry
 * `outside: true`.
 *
 * DatePicker pads its lead with empty spans and stops at the last day, so
 * February in a year where it starts on a Sunday draws four rows and a 31 day
 * month starting on a Saturday draws six. The popover resizes as the user pages
 * through the year and the day under the pointer moves out from under it. Fixed
 * at 42 because six weeks is the most any month can touch.
 *
 * `weekStartsOn` is 0 for Sunday and 1 for Monday.
 */
export function monthGrid(
  y: number,
  m: number,
  weekStartsOn: 0 | 1 = 0,
): { date: CalendarDate; outside: boolean }[] {
  const lead = mod7(firstWeekday(y, m) - weekStartsOn);
  const start = toDayNumber({ y, m, d: 1 }) - lead;
  const cells: { date: CalendarDate; outside: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = fromDayNumber(start + i);
    cells.push({ date, outside: date.y !== y || date.m !== m });
  }
  return cells;
}
