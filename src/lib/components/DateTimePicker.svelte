<script lang="ts">
  /**
   * A date and a time as one field, composed from DatePicker and TimePicker.
   *
   * The value is a local wall clock with no zone:
   *
   *     unset            ''
   *     seconds false    '2026-03-04T15:30'
   *     seconds true     '2026-03-04T15:30:45'
   *
   * Four digit year, two digit zero padded everything else, `T` between the two
   * halves. No offset, no trailing Z, no fraction. A string that is not one of
   * those three leaves both halves empty rather than being guessed at, and a
   * bare `YYYY-MM-DD` is read as that day with no time, because that is the
   * spelling a date field's own value carries.
   *
   * Why the value carries no offset. A datetime column is zone aware on
   * PostgreSQL, which stores TIMESTAMPTZ, and zone blind on MySQL and SQL
   * Server, which store DATETIME and DATETIME2. An offset written into the
   * value is kept by one of those three and dropped by the other two, so one
   * string would name a different instant depending on where it landed. The
   * offset a browser can supply is the viewer's own and not the one the content
   * is scheduled against, so an editor in Jakarta and an editor in New York
   * would write two different strings for the same intent. Converting a wall
   * clock to an absolute instant belongs at the boundary that knows which zone
   * to apply. This control knows only the browser's, so it does not convert.
   *
   * The rule this component exists to keep: no string is ever handed to the
   * Date parser. `new Date('2026-01-02')` is UTC midnight by specification and
   * `new Date('2026-01-02T00:00')` is local midnight, so one helper applied to
   * the date half and to the whole value lands in two different zones. Read the
   * first form back through the local getters west of UTC and the day is 1
   * January. That is the off by one day, it shows only for the part of the
   * world that is not on UTC, and it has already been fixed once in an
   * application built on this kit. Every piece of arithmetic below comes from
   * internal/calendar.ts and internal/time.ts, neither of which constructs a
   * Date from text.
   *
   * The two halves are one field, so the label, the hint and the error are
   * stated once here and the children are given none of their own. The label
   * points at the date trigger, which is a button and so is labelable, which
   * means clicking the label opens the calendar. The pair sits in a group that
   * carries the description, because a message about the whole instant belongs
   * to neither half on its own.
   */

  import { compareDates, parseISODate, toISODate } from '../internal/calendar.js';
  import type { CalendarDate } from '../internal/calendar.js';
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    describedBy,
  } from '../internal/field.js';
  import { parseISOTime, toISOTime } from '../internal/time.js';
  import type { TimeParts } from '../internal/time.js';
  import DatePicker from './DatePicker.svelte';
  import TimePicker from './TimePicker.svelte';

  interface Props {
    /** `YYYY-MM-DDTHH:mm`, or `YYYY-MM-DDTHH:mm:ss` with `seconds`. Empty for unset. */
    value?: string;
    id?: string;
    name?: string;
    label?: string;
    hint?: string;
    error?: string;
    /** Show a seconds segment on the time half, and carry seconds in the value. */
    seconds?: boolean;
    /** Draw the time half 12-hour with an AM/PM segment. The value stays 24-hour. */
    hour12?: boolean;
    /** Minute and second step on the time half. */
    step?: number;
    /** Earliest allowed instant, in the value format. A bare date means its midnight. */
    min?: string;
    /** Latest allowed instant, in the value format. A bare date means its last second. */
    max?: string;
    required?: boolean;
    disabled?: boolean;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    id = undefined,
    name = undefined,
    label = undefined,
    hint = undefined,
    error = undefined,
    seconds = false,
    hour12 = false,
    step = 1,
    min = undefined,
    max = undefined,
    required = false,
    disabled = false,
    class: klass = '',
    onchange = undefined,
  }: Props = $props();

  // $props.id() and not a random string: a random id differs between the server
  // render and hydration, so the label `for`, the group's aria-labelledby and
  // the message ids would each point at an element the client never rendered.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  /** A day and a clock reading with nothing between them that names a zone. */
  interface Moment {
    date: CalendarDate;
    time: TimeParts;
  }

  /** Named once because both the split and the join depend on the same character. */
  const DATE_TIME_SEPARATOR = 'T';

  const MIDNIGHT: TimeParts = { h: 0, mi: 0, s: 0 };
  const LAST_SECOND: TimeParts = { h: 23, mi: 59, s: 59 };

  const SECONDS_PER_MINUTE = 60;
  const SECONDS_PER_HOUR = 3600;

  /** The whole clock reading as one number, so a comparison cannot compare the minute first. */
  function secondsOfDay(time: TimeParts): number {
    return time.h * SECONDS_PER_HOUR + time.mi * SECONDS_PER_MINUTE + time.s;
  }

  function compareMoments(a: Moment, b: Moment): number {
    const byDay = compareDates(a.date, b.date);
    if (byDay !== 0) return byDay;
    const at = secondsOfDay(a.time);
    const bt = secondsOfDay(b.time);
    if (at === bt) return 0;
    return at < bt ? -1 : 1;
  }

  /**
   * Splits the value into the two strings the children read.
   *
   * Each half is parsed by the module that owns its format and written back
   * from the parsed parts, so a half the parser rejects reaches the child as an
   * empty string rather than as text it would show and then refuse to edit. A
   * value with no day has no time either: a clock reading with no date names no
   * instant, and showing one would claim the field holds something it cannot
   * emit.
   */
  function splitValue(raw: string | undefined): { date: string; time: string } {
    const text = raw ?? '';
    const cut = text.indexOf(DATE_TIME_SEPARATOR);
    const day = parseISODate(cut < 0 ? text : text.slice(0, cut));
    if (day === null) return { date: '', time: '' };
    const clock = cut < 0 ? null : parseISOTime(text.slice(cut + 1));
    return {
      date: toISODate(day),
      // Rewritten to the shape `seconds` asks for, so a value carrying seconds
      // into a field with no second segment does not sit in the time half as a
      // string that control would never write.
      time: clock === null ? '' : toISOTime(clock, seconds),
    };
  }

  /**
   * Reads a bound as a whole instant.
   *
   * A bare `YYYY-MM-DD` is filled with the end of the range it stands for: a
   * min of a bare day starts at its midnight and a max of a bare day runs to
   * its last second. Filling both with midnight would make a max of the last
   * allowed day reject every time on that day except midnight, which reads to
   * the user as a day they are offered and cannot use.
   */
  function parseBound(raw: string | undefined, fill: TimeParts): Moment | null {
    if (!raw) return null;
    const cut = raw.indexOf(DATE_TIME_SEPARATOR);
    const day = parseISODate(cut < 0 ? raw : raw.slice(0, cut));
    if (day === null) return null;
    if (cut < 0) return { date: day, time: fill };
    const clock = parseISOTime(raw.slice(cut + 1));
    return clock === null ? null : { date: day, time: clock };
  }

  /** Bounds the whole instant. Clamping a half on its own is the defect this field avoids. */
  function clampMoment(moment: Moment, lower: Moment | null, upper: Moment | null): Moment {
    if (lower !== null && compareMoments(moment, lower) < 0) return lower;
    if (upper !== null && compareMoments(moment, upper) > 0) return upper;
    return moment;
  }

  // Each half holds its own string, so one can be filled while the other is
  // empty. Deriving both from `value` instead would mean a date the user picks
  // before touching the clock has nowhere to live until the clock is set.
  const seed = splitValue(value);
  let datePart = $state(seed.date);
  let timePart = $state(seed.time);

  // What was last handed to or taken from the consumer. Without it the effect
  // below would adopt the field's own writes and reset both halves on every
  // keystroke.
  let mirrored = value ?? '';

  // The seed above runs once, so a value the consumer changes later has to be
  // adopted here. Seeding in this effect instead would leave the server render
  // showing an empty field for a value it was given.
  $effect(() => {
    const incoming = value ?? '';
    if (incoming === mirrored) return;
    mirrored = incoming;
    const next = splitValue(incoming);
    datePart = next.date;
    timePart = next.time;
  });

  const lowerBound = $derived(parseBound(min, MIDNIGHT));
  const upperBound = $derived(parseBound(max, LAST_SECOND));
  const chosenDay = $derived(parseISODate(datePart));

  const dateMin = $derived(lowerBound === null ? undefined : toISODate(lowerBound.date));
  const dateMax = $derived(upperBound === null ? undefined : toISODate(upperBound.date));

  /**
   * A time bound reaches the time half only on the day that bound falls on.
   *
   * With min 2026-03-04T09:00 and max 2026-03-06T17:00, eight in the morning on
   * the fifth is inside the range. Handing 09:00 to the time half on every day
   * would rewrite it to nine, which is the per-half clamp this component exists
   * to keep out.
   */
  const timeMin = $derived(
    lowerBound !== null && chosenDay !== null && compareDates(chosenDay, lowerBound.date) === 0
      ? toISOTime(lowerBound.time, seconds)
      : undefined,
  );
  const timeMax = $derived(
    upperBound !== null && chosenDay !== null && compareDates(chosenDay, upperBound.date) === 0
      ? toISOTime(upperBound.time, seconds)
      : undefined,
  );

  function publish(next: string): void {
    if (next === value) return;
    mirrored = next;
    value = next;
    onchange?.(next);
  }

  /**
   * Writes the two halves out as one instant.
   *
   * A day with no clock reading is midnight. Refusing to write anything would
   * leave the calendar marking a day the consumer does not hold, and a day is
   * the half a user reaches for first. A clock reading with no day stays on
   * screen and publishes nothing, because there is no instant to name yet.
   */
  function commit(): void {
    const day = parseISODate(datePart);
    if (day === null) {
      publish('');
      return;
    }
    const clock = parseISOTime(timePart) ?? MIDNIGHT;
    const bounded = clampMoment({ date: day, time: clock }, lowerBound, upperBound);
    datePart = toISODate(bounded.date);
    timePart = toISOTime(bounded.time, seconds);
    publish(`${datePart}${DATE_TIME_SEPARATOR}${timePart}`);
  }

  function onDateChange(next: string): void {
    datePart = next;
    commit();
  }

  function onTimeChange(next: string): void {
    timePart = next;
    commit();
  }
</script>

<div class="{FIELD_WRAP} {klass}">
  {#if label}
    <!-- `for` the date trigger. A button is labelable, so the field's own label
         names it and clicking that label opens the calendar. The group below
         takes its name from this same element. -->
    <label id="{fieldId}-label" for="{fieldId}-date" class={FIELD_LABEL}>
      {label}{#if required}<span class="ml-0.5 text-danger" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <!--
    role="group" and no aria-invalid. ARIA does not let a group carry that
    property, and the compiler's a11y gate rejects it. The error reaches a
    reader through aria-describedby instead, which is the route a control with
    no value of its own already uses.
  -->
  <div
    role="group"
    aria-labelledby={label ? `${fieldId}-label` : undefined}
    aria-label={label ? undefined : 'Date and time'}
    aria-describedby={describedBy(fieldId, error, hint)}
    class="flex flex-wrap items-start gap-2"
  >
    <!-- Neither child is given a label, a hint or an error. Each renders its own
         when it has one, and three message rows under one field is what this
         component was written to replace. -->
    <DatePicker
      id="{fieldId}-date"
      value={datePart}
      min={dateMin}
      max={dateMax}
      {required}
      {disabled}
      class="min-w-44 flex-1"
      onchange={onDateChange}
    />
    <TimePicker
      id="{fieldId}-time"
      value={timePart}
      min={timeMin}
      max={timeMax}
      {seconds}
      {hour12}
      {step}
      {required}
      {disabled}
      onchange={onTimeChange}
    />
  </div>

  <!-- The one control a form serializes. The halves carry no name of their own,
       so a submit posts the instant and not the two strings it was built from. -->
  <input type="hidden" {name} {value} />

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
