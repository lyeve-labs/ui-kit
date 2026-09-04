<script lang="ts">
  import {
    CONTROL_SEGMENT,
    CONTROL_SEGMENTED,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    describedBy,
    segmentedBorder,
  } from '../internal/field.js';
  import {
    clampTime,
    from12Hour,
    pad2,
    parseISOTime,
    stepSegment,
    to12Hour,
    toISOTime,
  } from '../internal/time.js';
  import type { TimeParts, TimeSegment } from '../internal/time.js';

  /**
   * A time field built from one input per segment, and deliberately not from a
   * single masked input.
   *
   * A masked input has exactly one accessible value, so every keystroke
   * re-announces the whole string: a screen reader user typing an hour hears
   * the minutes and the seconds read back at them, and there is no way to say
   * which part of that string the caret is in. Separate inputs give each
   * segment its own name, its own value and its own announcement, and let each
   * one be a spinbutton with real bounds rather than three ranges hidden inside
   * one text field.
   *
   * The value on the wire is 24-hour whatever the display shows:
   *
   *     unset            ''
   *     seconds false    '09:30'
   *     seconds true     '09:30:15'
   *
   * `hour12` changes only what is drawn. Every step, wrap and bound comes from
   * internal/time.ts, which is where the arithmetic that a picker gets wrong on
   * the first attempt already lives.
   */

  /** A segment the user types digits into. The meridiem is a select, not a spinbutton. */
  type DigitSegment = Exclude<TimeSegment, 'meridiem'>;

  interface Props {
    value?: string;
    id?: string;
    name?: string;
    label?: string;
    hint?: string;
    error?: string;
    /** Show a seconds segment. */
    seconds?: boolean;
    /** Draw 12-hour with an AM/PM segment. The wire format stays 24-hour. */
    hour12?: boolean;
    /** Minute and second step. Arrow keys move by this. */
    step?: number;
    min?: string;
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
  // render and hydration, so every aria-labelledby and every label `for` built
  // from it points at an element that does not exist on the client.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  const SEGMENT_LABEL: Record<DigitSegment, string> = {
    hour: 'Hour',
    minute: 'Minute',
    second: 'Second',
  };

  /** PageUp and PageDown move by ten whatever `step` is, so a coarse step still has a coarse key. */
  const PAGE_STEP = 10;

  // Each segment holds its own number, so one of them can be empty while the
  // others are filled. Holding the whole time as a string instead means
  // Backspace on the minute has to clear the hour too, since '09:--' is not a
  // value this field is allowed to emit.
  const seed = parseISOTime(value);
  let hour = $state<number | null>(seed ? seed.h : null);
  let minute = $state<number | null>(seed ? seed.mi : null);
  let second = $state<number | null>(seed ? seed.s : null);

  // The meridiem follows the hour once there is one. It is remembered on its
  // own only while the hour is empty, so picking PM and then typing 3 gives 15
  // rather than 3.
  let meridiemPref = $state<'AM' | 'PM'>(seed ? to12Hour(seed.h).meridiem : 'AM');
  const meridiem = $derived<'AM' | 'PM'>(hour === null ? meridiemPref : to12Hour(hour).meridiem);

  // The first of two digits, before it is worth anything on its own. Only one
  // segment can be mid-entry, because only one of them holds the caret.
  let draft = $state<{ segment: DigitSegment; text: string } | null>(null);

  let group = $state<HTMLDivElement | null>(null);

  // What was last handed to or taken from the consumer. Without it the effect
  // below would adopt the field's own writes and wipe the draft on every
  // keystroke.
  let mirrored = value;

  const minParts = $derived(parseISOTime(min));
  const maxParts = $derived(parseISOTime(max));

  // A step of 0 makes ArrowUp a no-op that looks like a broken key, and a
  // negative one inverts the arrows.
  const stepUnit = $derived(Math.max(1, Math.trunc(step)));

  const digitSegments = $derived<DigitSegment[]>(
    seconds ? ['hour', 'minute', 'second'] : ['hour', 'minute'],
  );

  // The seed above runs once, so a value the consumer changes later has to be
  // adopted here. Seeding in this effect instead would leave the server render
  // showing empty segments for a value it was given.
  $effect(() => {
    const incoming = value ?? '';
    if (incoming === mirrored) return;
    mirrored = incoming;
    draft = null;
    const parts = parseISOTime(incoming);
    hour = parts ? parts.h : null;
    minute = parts ? parts.mi : null;
    second = parts ? parts.s : null;
    if (parts) meridiemPref = to12Hour(parts.h).meridiem;
  });

  function rawOf(segment: DigitSegment): number | null {
    if (segment === 'hour') return hour;
    if (segment === 'minute') return minute;
    return second;
  }

  /** The number the segment shows, which is not the number it stores in 12-hour mode. */
  function displayOf(segment: DigitSegment): number | null {
    const n = rawOf(segment);
    if (n === null) return null;
    return segment === 'hour' && hour12 ? to12Hour(n).hour : n;
  }

  function shown(segment: DigitSegment): string {
    if (draft?.segment === segment) return draft.text;
    const n = displayOf(segment);
    return n === null ? '' : pad2(n);
  }

  function shownNow(segment: DigitSegment): number | undefined {
    const text = shown(segment);
    return text === '' ? undefined : Number(text);
  }

  /**
   * An empty spinbutton has no aria-valuenow to give, so it says so in words.
   * Omitting both leaves the segment announced as an unlabelled number.
   */
  function valueText(segment: DigitSegment): string {
    const text = shown(segment);
    return text === '' ? 'Empty' : text;
  }

  function segmentMin(segment: DigitSegment): number {
    // A 12-hour clock has no hour zero. Every other segment starts at zero.
    return segment === 'hour' && hour12 ? 1 : 0;
  }

  function segmentMax(segment: DigitSegment): number {
    if (segment !== 'hour') return 59;
    return hour12 ? 12 : 23;
  }

  function setSegment(segment: DigitSegment, n: number): void {
    const bounded = Math.min(segmentMax(segment), Math.max(segmentMin(segment), n));
    if (segment === 'hour') {
      hour = hour12 ? from12Hour(bounded, meridiem) : bounded;
    } else if (segment === 'minute') {
      minute = bounded;
    } else {
      second = bounded;
    }
  }

  function clearSegment(segment: DigitSegment): void {
    if (segment === 'hour') hour = null;
    else if (segment === 'minute') minute = null;
    else second = null;
  }

  function publish(next: string): void {
    if (next === value) return;
    mirrored = next;
    value = next;
    onchange?.(next);
  }

  /**
   * Writes the segments out, once they add up to a whole time.
   *
   * The bounds are applied to that whole time and never to a segment on its
   * own: with min 09:30 the time 10:15 is legal, and clamping the minute by
   * itself would rewrite it to 10:30.
   */
  function commit(): void {
    if (hour === null || minute === null || (seconds && second === null)) {
      publish('');
      return;
    }
    const clamped = clampTime(
      { h: hour, mi: minute, s: seconds ? (second ?? 0) : 0 },
      minParts,
      maxParts,
    );
    hour = clamped.h;
    minute = clamped.mi;
    if (seconds) second = clamped.s;
    publish(toISOTime(clamped, seconds));
  }

  function focusSegment(from: TimeSegment, delta: number): void {
    if (!group) return;
    const all = [...group.querySelectorAll<HTMLElement>('[data-segment]')];
    const index = all.findIndex((el) => el.dataset.segment === from);
    const next = all[index + delta];
    if (!next) return;
    next.focus();
    // Selecting means the next digit replaces what is there rather than
    // appending to it, which is what a segment the caret has just arrived in
    // has to do.
    if (next instanceof HTMLInputElement) next.select();
  }

  function stepBy(segment: DigitSegment, delta: number, unit: number): void {
    draft = null;
    // Empty segments count as zero for the arithmetic and stay empty unless
    // they are the one being stepped: stepSegment does not carry, and neither
    // does this.
    const keep = meridiem;
    const base: TimeParts = { h: hour ?? 0, mi: minute ?? 0, s: second ?? 0 };
    const stepped = stepSegment(base, segment, delta, unit);
    if (segment === 'hour') {
      // In 12-hour display the hour cycles inside its own meridiem, 12 to 11
      // and back. Letting it flip AM to PM would be the hour segment writing
      // into the segment beside it.
      hour = hour12 ? from12Hour(to12Hour(stepped.h).hour, keep) : stepped.h;
    } else if (segment === 'minute') {
      minute = stepped.mi;
    } else {
      second = stepped.s;
    }
    commit();
  }

  function typeDigit(segment: DigitSegment, digit: string): void {
    const high = segmentMax(segment);
    const pending = draft?.segment === segment ? draft.text : '';
    const combined = Number(pending + digit);

    if (pending !== '' && combined <= high) {
      draft = null;
      setSegment(segment, combined);
      commit();
      focusSegment(segment, 1);
      return;
    }

    // Either the first digit, or a second one that cannot follow the first. A
    // digit no legal value can be built on top of decides the segment on its
    // own: 5 in a 24-hour hour is 05, because 50 is not an hour.
    const single = Number(digit);
    if (single * 10 > high) {
      draft = null;
      setSegment(segment, single);
      commit();
      focusSegment(segment, 1);
      return;
    }
    draft = { segment, text: digit };
  }

  function onSegmentKeydown(segment: DigitSegment, e: KeyboardEvent): void {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        // The hour moves by one whatever the step is. A step of 15 is a
        // statement about minutes, and quarter-day hours are not a thing.
        stepBy(segment, e.key === 'ArrowUp' ? 1 : -1, segment === 'hour' ? 1 : stepUnit);
        return;
      case 'PageUp':
      case 'PageDown':
        e.preventDefault();
        stepBy(segment, e.key === 'PageUp' ? 1 : -1, PAGE_STEP);
        return;
      case 'Home':
      case 'End':
        e.preventDefault();
        draft = null;
        setSegment(segment, e.key === 'Home' ? segmentMin(segment) : segmentMax(segment));
        commit();
        return;
      case 'ArrowLeft':
        e.preventDefault();
        focusSegment(segment, -1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        focusSegment(segment, 1);
        return;
      case 'Backspace':
        e.preventDefault();
        draft = null;
        clearSegment(segment);
        commit();
        focusSegment(segment, -1);
        return;
      case 'Delete':
        e.preventDefault();
        draft = null;
        clearSegment(segment);
        commit();
        return;
      default:
        break;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      typeDigit(segment, e.key);
      return;
    }

    // Anything else printable would land in the input as free text. Tab,
    // Escape and every shortcut keep their native behaviour.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
  }

  function onSegmentInput(segment: DigitSegment, e: Event & { currentTarget: HTMLInputElement }) {
    // Paste, drop and an IME never reach keydown. The segment is drawn from
    // state, so nothing that arrives this way is parsed: the field simply puts
    // back what it was showing.
    e.currentTarget.value = shown(segment);
  }

  function onSegmentBlur(segment: DigitSegment): void {
    if (draft?.segment !== segment) return;
    const single = Number(draft.text);
    draft = null;
    setSegment(segment, single);
    commit();
  }

  function onMeridiemChange(e: Event & { currentTarget: HTMLSelectElement }): void {
    const next = e.currentTarget.value === 'PM' ? 'PM' : 'AM';
    meridiemPref = next;
    if (hour !== null && to12Hour(hour).meridiem !== next) {
      hour = stepSegment({ h: hour, mi: 0, s: 0 }, 'meridiem', 1, 1).h;
    }
    commit();
  }

  function onMeridiemKeydown(e: KeyboardEvent): void {
    // Up and down still pick an option, which is what a select does. Left and
    // right belong to the field: they walk the segments.
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    focusSegment('meridiem', e.key === 'ArrowLeft' ? -1 : 1);
  }
</script>

<div class="{FIELD_WRAP} {klass}">
  {#if label}
    <!-- `for` the hour so a click lands somewhere useful, while the group below
         takes its name from this same element. The hour keeps its own aria-label,
         which is what a screen reader reads for it. -->
    <label id="{fieldId}-label" for="{fieldId}-hour" class={FIELD_LABEL}>
      {label}{#if required}<span class="ml-0.5 text-danger" aria-label="required">*</span>{/if}
    </label>
  {/if}

  <div
    bind:this={group}
    role="group"
    aria-labelledby={label ? `${fieldId}-label` : undefined}
    aria-label={label ? undefined : 'Time'}
    aria-describedby={describedBy(fieldId, error, hint)}
    class="{CONTROL_SEGMENTED} {segmentedBorder(!!error)} {disabled
      ? 'cursor-not-allowed opacity-50'
      : ''}"
  >
    {#each digitSegments as segment, i (segment)}
      {#if i > 0}
        <span aria-hidden="true" class="text-faint">:</span>
      {/if}
      <input
        data-segment={segment}
        id="{fieldId}-{segment}"
        type="text"
        inputmode="numeric"
        role="spinbutton"
        autocomplete="off"
        spellcheck="false"
        maxlength="2"
        {disabled}
        value={shown(segment)}
        aria-label={SEGMENT_LABEL[segment]}
        aria-valuenow={shownNow(segment)}
        aria-valuemin={segmentMin(segment)}
        aria-valuemax={segmentMax(segment)}
        aria-valuetext={valueText(segment)}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        onkeydown={(e) => onSegmentKeydown(segment, e)}
        oninput={(e) => onSegmentInput(segment, e)}
        onblur={() => onSegmentBlur(segment)}
        onfocus={(e) => e.currentTarget.select()}
        class="{CONTROL_SEGMENT} w-7"
      />
    {/each}

    {#if hour12}
      <!-- A select, because two values is exactly what a select is for: it keeps
           the native option list, the native keyboard and the native
           announcement instead of a button pretending to be one. -->
      <select
        data-segment="meridiem"
        id="{fieldId}-meridiem"
        {disabled}
        value={meridiem}
        aria-label="AM or PM"
        aria-invalid={error ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        onchange={onMeridiemChange}
        onkeydown={onMeridiemKeydown}
        class="{CONTROL_SEGMENT} ml-1"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    {/if}
  </div>

  <!-- The segments carry no name, so a form serializes this and only this. Three
       separately named parts would post three fields the server never asked for,
       and in 12-hour display two of them would be the wrong numbers. -->
  <input type="hidden" {name} {value} />

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
