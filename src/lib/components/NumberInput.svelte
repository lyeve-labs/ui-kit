<script lang="ts">
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    label?: string;
    hint?: string;
    error?: string;
    class?: string;
    onchange?: (v: number) => void;
  }

  let {
    value = $bindable(0),
    min = undefined,
    max = undefined,
    step = 1,
    disabled = false,
    required = false,
    id = undefined,
    name = undefined,
    label = undefined,
    hint = undefined,
    error = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined));

  function dec() {
    const next = value - step;
    if (min !== undefined && next < min) return;
    value = next;
    onchange?.(value);
  }

  function inc() {
    const next = value + step;
    if (max !== undefined && next > max) return;
    value = next;
    onchange?.(value);
  }

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    const n = parseFloat(e.currentTarget.value);
    if (!isNaN(n)) {
      value = n;
      onchange?.(n);
    }
  }

  let canDec = $derived(!(disabled || (min !== undefined && value <= min)));
  let canInc = $derived(!(disabled || (max !== undefined && value >= max)));

  // line-strong, not line: the stepper buttons and the number between them read
  // as one control, and line sits at 1.25:1, so the caps of that control were
  // the part a low-vision user could not find.
  const step_ =
    'flex w-control shrink-0 items-center justify-center border-line-strong bg-surface-2 text-muted ' +
    'transition-colors duration-150 hover:bg-line hover:text-fg ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
    </label>
  {/if}

  <div class="flex h-control">
    <button
      type="button"
      onclick={dec}
      disabled={!canDec}
      aria-label="Decrease"
      class="{step_} rounded-l-lg border border-r-0"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
      </svg>
    </button>

    <input
      type="number"
      id={fieldId}
      {name}
      {min}
      {max}
      {step}
      {disabled}
      {required}
      {value}
      oninput={handleInput}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      class="min-w-0 flex-1 border-y bg-surface-2 text-center text-sm text-fg
        outline-none transition-colors duration-150
        disabled:cursor-not-allowed disabled:opacity-50
        [appearance:textfield]
        [&::-webkit-inner-spin-button]:appearance-none
        [&::-webkit-outer-spin-button]:appearance-none
        {controlBorder(!!error)}"
    />

    <button
      type="button"
      onclick={inc}
      disabled={!canInc}
      aria-label="Increase"
      class="{step_} rounded-r-lg border border-l-0"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </div>

  {#if error}
    <p id={fieldId ? `${fieldId}-error` : undefined} class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id={fieldId ? `${fieldId}-hint` : undefined} class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
