<script lang="ts">
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';
  // DatePicker: a text trigger + calendar popover. Binds `value` to an ISO date
  // string ("YYYY-MM-DD"). Pure local-date math (no timezone surprises).
  let {
    value = $bindable(''),
    label = undefined,
    hint = undefined,
    error = undefined,
    placeholder = 'Select a date',
    min = undefined,
    max = undefined,
    disabled = false,
    required = false,
    id = undefined,
    class: cls = '',
    onchange = undefined,
  }: {
    value?: string;
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    min?: string;
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

  function parseISO(s?: string): { y: number; m: number; d: number } | null {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }
  function pad(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
  }
  function toISO(y: number, m: number, d: number) {
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  const today = new Date();
  const initial = parseISO(value) ?? {
    y: today.getFullYear(),
    m: today.getMonth() + 1,
    d: today.getDate(),
  };
  let viewYear = $state(initial.y);
  let viewMonth = $state(initial.m); // 1-12

  const display = $derived.by(() => {
    const p = parseISO(value);
    if (!p) return '';
    return new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  });

  // Grid of day numbers (null = leading blank) for the viewed month.
  const cells = $derived.by(() => {
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
    const days = new Date(viewYear, viewMonth, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  });

  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());

  function isDisabled(d: number) {
    const iso = toISO(viewYear, viewMonth, d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  function pick(d: number) {
    if (isDisabled(d)) return;
    value = toISO(viewYear, viewMonth, d);
    onchange?.(value);
    open = false;
  }

  function prevMonth() {
    if (viewMonth === 1) {
      viewMonth = 12;
      viewYear -= 1;
    } else {
      viewMonth -= 1;
    }
  }
  function nextMonth() {
    if (viewMonth === 12) {
      viewMonth = 1;
      viewYear += 1;
    } else {
      viewMonth += 1;
    }
  }

  function openCal() {
    if (disabled) return;
    const p = parseISO(value);
    if (p) {
      viewYear = p.y;
      viewMonth = p.m;
    }
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

<div class="{FIELD_WRAP} {cls}" bind:this={containerEl}>
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-hidden="true">*</span>{/if}
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
      class="{CONTROL_BASE} {controlBorder(!!error)} flex items-center justify-between text-left"
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
      -->
      <div
        id={calendarId}
        role="dialog"
        aria-label="Choose date"
        class="absolute z-50 mt-1 w-[17rem] rounded-xl border border-line bg-surface shadow-2xl p-3"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            aria-label="Previous month"
            onclick={prevMonth}
            class="p-1.5 rounded-md text-muted hover:bg-surface-2 hover:text-fg transition-colors duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"
              ><path
                d="M7.5 2L4 6l3.5 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
            >
          </button>
          <span class="text-sm font-medium text-fg">{MONTHS[viewMonth - 1]} {viewYear}</span>
          <button
            type="button"
            aria-label="Next month"
            onclick={nextMonth}
            class="p-1.5 rounded-md text-muted hover:bg-surface-2 hover:text-fg transition-colors duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"
              ><path
                d="M4.5 2L8 6l-3.5 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
            >
          </button>
        </div>

        <!-- Weekday labels -->
        <div class="grid grid-cols-7 mb-1">
          {#each WEEKDAYS as wd}
            <span class="text-center text-[0.65rem] font-medium text-faint py-1">{wd}</span>
          {/each}
        </div>

        <!-- Day grid -->
        <div class="grid grid-cols-7 gap-0.5">
          {#each cells as d}
            {#if d === null}
              <span></span>
            {:else}
              {@const iso = toISO(viewYear, viewMonth, d)}
              <button
                type="button"
                disabled={isDisabled(d)}
                onclick={() => pick(d)}
                aria-current={iso === todayISO ? 'date' : undefined}
                aria-label={iso}
                class="h-8 w-8 mx-auto flex items-center justify-center rounded-md text-sm transition-colors duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                  {iso === value
                  ? 'bg-brand text-ink font-medium'
                  : iso === todayISO
                    ? 'text-brand font-medium hover:bg-surface-2'
                    : 'text-fg hover:bg-surface-2'}">{d}</button
              >
            {/if}
          {/each}
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
