<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { HIT_AREA } from '../internal/touch.js';
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';
  import { PANEL_LIST_UNCAPPED, PANEL_SURFACE, placePanel } from '../internal/panel.js';
  import * as motion from '../motion.js';
  import {
    addMonths,
    monthGrid,
    parseISODate,
    toISODate,
    todayLocal,
    withinRange,
    type CalendarDate,
  } from '../internal/calendar.js';
  let {
    value = $bindable(''),
    label = undefined,
    hint = undefined,
    error = undefined,
    placeholder = 'Choose a date',
    min = undefined,
    max = undefined,
    disabled = false,
    required = false,
    id = undefined,
    class: cls = '',
    onchange = undefined,
  }: {
    /** The chosen day as `YYYY-MM-DD`, or the empty string. Bindable. */
    value?: string;
    label?: string;
    hint?: string;
    error?: string;
    /** Shown on the trigger until a day is chosen. */
    placeholder?: string;
    /** The earliest day that can be chosen, as `YYYY-MM-DD`. Earlier days are disabled. */
    min?: string;
    /** The latest day that can be chosen, as `YYYY-MM-DD`. Later days are disabled. */
    max?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    class?: string;
    onchange?: (value: string) => void;
  } = $props();

  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  /*
   * $props.id() and not a random string: a random id differs between the server
   * and the client, so every id derived from it changes under the first paint.
   *
   * The fallback is the fix for a standalone <DatePicker label="Starts" />,
   * which rendered a <label> with no `for` at all: the trigger was named by its
   * placeholder, so the field announced as "Select a date" and the visible
   * label pointed at nothing.
   */
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);
  const calendarId = $derived(`${fieldId}-calendar`);

  let open = $state(false);
  let containerEl: HTMLDivElement | undefined = $state();

  const today = todayLocal();
  const todayISO = toISODate(today);

  /** The month on screen, always on its first day. */
  let view = $state<CalendarDate>({ ...(parseISODate(value) ?? today), d: 1 });

  /**
   * The chosen day as en-US spells it, "Jun 15, 2024". Fixed rather than the
   * browser's locale, so the server and the browser render the same text.
   */
  const display = $derived.by(() => {
    const p = parseISODate(value);
    if (!p) return '';
    return `${MONTHS[p.m - 1].slice(0, 3)} ${p.d}, ${p.y}`;
  });

  const cells = $derived(monthGrid(view.y, view.m));
  const bounds = $derived({ min: parseISODate(min), max: parseISODate(max) });

  function isDisabled(date: CalendarDate) {
    return !withinRange(date, bounds.min, bounds.max);
  }

  function pick(date: CalendarDate) {
    if (isDisabled(date)) return;
    value = toISODate(date);
    onchange?.(value);
    open = false;
  }

  function prevMonth() {
    view = addMonths(view, -1);
  }
  function nextMonth() {
    view = addMonths(view, 1);
  }

  function openCal() {
    if (disabled) return;
    const p = parseISODate(value);
    if (p) view = { ...p, d: 1 };
    open = true;
  }

  function handleOutside(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) open = false;
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
  $effect(() => {
    if (open) {
      document.addEventListener('click', handleOutside, { capture: true });
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('click', handleOutside, { capture: true });
      document.removeEventListener('keydown', handleKey);
    };
  });
</script>

<div data-field class="{FIELD_WRAP} {cls}" bind:this={containerEl}>
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ms-0.5" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    <!--
      role="combobox" over the button's own role, and aria-haspopup="dialog"
      beside it. ARIA 1.2 does not list aria-required for button, so the
      attribute was stripped from the accessibility tree and the requirement
      reached a reader nowhere: the asterisk in the label is decorative and this
      picker posts no native input that could take `required`. A combobox is an
      input whose popup helps set its value, which is what the trigger and the
      calendar below are, and it supports aria-required and aria-invalid.

      aria-controls is set only while the calendar is on screen. The popup is
      rendered on open, so naming it while it is closed points a reader at an
      element that does not exist.
    -->
    <button
      type="button"
      id={fieldId}
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? calendarId : undefined}
      {disabled}
      onclick={() => (open ? (open = false) : openCal())}
      aria-invalid={error ? 'true' : undefined}
      aria-required={required ? 'true' : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      class="{CONTROL_BASE} {controlBorder(!!error)} flex items-center justify-between text-start"
    >
      <span class={display ? 'text-fg' : 'text-faint'}>{display || placeholder}</span>
      <span class="text-faint shrink-0" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect
            x="2.5"
            y="3.5"
            width="11"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path
            d="M2.5 6.5h11M5.5 2v3M10.5 2v3"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        </svg>
      </span>
    </button>

    {#if open}
      <!--
        role="dialog" with a name of its own, because the trigger advertises
        aria-haspopup="dialog". A bare div leaves that claim unbacked, and a
        dialog with no name is announced as "dialog" and nothing else. The name
        is fixed rather than built from the field label, so a reader hears what
        the popup does instead of the label they just heard.

        The surface is the shared panel, placed by placePanel: the calendar sat
        under the trigger unconditionally, so inside a modal body it opened into
        the part of the scroll region nobody could reach and was cut below the
        weekday row. The width stays here, sized to seven columns. The region
        inside is capped by the room and not by the list token, which is shorter
        than six weeks of days, and never below the whole grid: in a modal body
        too short for it on either side, placePanel makes room under the field.

        Under a finger each day keeps its 32px face and a 44px hit box, so the
        days have to sit 44px apart or each box covers a third of its
        neighbors'. Seven 44px columns are 308px. Inside a 1px border and 6px
        of padding that is a 320px panel, the width of the narrowest phone,
        and placePanel slides it back on screen from the page gutter. In a
        modal body narrower than that, placePanel shrinks it to the body and
        the columns close up, but never below the grid: seven 32px days, six
        2px gaps, the padding and the border, or the days would overflow and
        the calendar scroll sideways inside itself. The rows open a 12px gap for the same reason.
      -->
      <div
        id={calendarId}
        role="dialog"
        aria-label="Choose a date"
        use:placePanel
        transition:motion.popover|global
        class="{PANEL_SURFACE} w-68 min-w-65.5 coarse:w-80 coarse:min-w-62.5"
      >
        <div
          class="overflow-y-auto overscroll-contain p-3 coarse:p-1.5"
          data-panel-list={PANEL_LIST_UNCAPPED}
        >
          <!-- Header. Under a finger each 26px month step takes a 44px box,
               9px past it, and the region's padding is 6px, so the header
               insets itself by the other 3px at the sides and the top. The
               boxes stay whole inside the calendar, which no longer pans. -->
          <div class="flex items-center justify-between mb-2 coarse:px-0.75 coarse:pt-0.75">
            <button
              type="button"
              aria-label="Previous month"
              onclick={prevMonth}
              class="{HIT_AREA} p-1.5 rounded-md text-muted hover:bg-surface-2 hover:text-fg transition-colors"
            >
              <ChevronLeft size={14} absoluteStrokeWidth strokeWidth={1.75} aria-hidden="true" />
            </button>
            <span class="text-sm font-medium text-fg">{MONTHS[view.m - 1]} {view.y}</span>
            <button
              type="button"
              aria-label="Next month"
              onclick={nextMonth}
              class="{HIT_AREA} p-1.5 rounded-md text-muted hover:bg-surface-2 hover:text-fg transition-colors"
            >
              <ChevronRight size={14} absoluteStrokeWidth strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <!-- Weekday labels -->
          <div class="grid grid-cols-7 mb-1">
            {#each WEEKDAYS as wd (wd)}
              <span class="text-center text-[0.65rem] font-medium text-faint py-1">{wd}</span>
            {/each}
          </div>

          <!-- Day grid -->
          <!--
            Shrunk into a narrow modal, the columns close below 44px and the
            day boxes would overlap. The grid is a container, so each box
            takes the smaller of the control size and one column's pitch, the
            grid's width and one gap over seven, and keeps its height. The
            boxes meet at any width.
          -->
          <div
            class="@container grid grid-cols-7 gap-0.5 coarse:gap-y-3 coarse:[--hit-width:min(var(--spacing-control),calc((100cqw_+_0.125rem)_/_7))]"
            data-day-grid
          >
            {#each cells as cell (toISODate(cell.date))}
              {#if cell.outside}
                <span></span>
              {:else}
                {@const iso = toISODate(cell.date)}
                <button
                  type="button"
                  disabled={isDisabled(cell.date)}
                  onclick={() => pick(cell.date)}
                  aria-current={iso === todayISO ? 'date' : undefined}
                  aria-label={iso}
                  class="{HIT_AREA} h-8 w-8 mx-auto flex items-center justify-center rounded-md text-sm transition-colors
                  disabled:opacity-30 disabled:cursor-not-allowed
                  {iso === value
                    ? 'bg-brand text-ink font-medium'
                    : iso === todayISO
                      ? 'text-brand font-medium hover:bg-surface-2'
                      : 'text-fg hover:bg-surface-2'}">{cell.date.d}</button
                >
              {/if}
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
