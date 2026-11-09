<script lang="ts">
  import FieldMessage from '../internal/FieldMessage.svelte';
  import FieldLabel from '../internal/FieldLabel.svelte';
  import AssistRow from '../internal/AssistRow.svelte';
  import { assistField } from '../internal/assist.svelte.js';
  import { ASSIST_WRAP, FIELD_WRAP, controlBorder, describedBy } from '../internal/field.js';
  import { HIT_AREA } from '../internal/touch.js';
  import { inSentence } from '../internal/words.js';

  interface Props {
    value?: number;
    /** The lowest value. The decrease button is disabled at it. */
    min?: number;
    /** The highest value. The increase button is disabled at it. */
    max?: number;
    /** How far each button moves the value. */
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
    /**
     * Keeps the value from an assistant: a FormAssist never reports it and
     * never fills it. Also marks the control `data-no-ai` for a browser agent.
     */
    noAI?: boolean;
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
    noAI = false,
  }: Props = $props();

  const assist = assistField({
    get name() {
      return name;
    },
    get label() {
      return label;
    },
    get hint() {
      return hint;
    },
    kind: 'number',
    get required() {
      return required;
    },
    get noAI() {
      return noAI;
    },
    accepts(v) {
      return (
        (min === undefined || (v as number) >= min) && (max === undefined || (v as number) <= max)
      );
    },
    get value() {
      return value;
    },
    set value(v) {
      value = v as number;
    },
  });

  // $props.id() and not the label: two fields under one label on a page took
  // one id, and both labels named the first control. It also matches between
  // the server render and hydration, which a random string would not.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

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
  //
  // Under a finger the control token grows to 44px, and steppers as wide as the
  // token left the number 40px inside a 128px field. They narrow instead and
  // take a hit box of the control size, so the number keeps its room and each
  // stepper is still a 44px target. A box centered on a 32px stepper reaches
  // 6px past each side, into the number on one of them, so each box is pinned
  // to the edge the stepper shares with the number and grows outward instead.
  // The sides are logical, so a right-to-left page mirrors them.
  //
  // A stepper at its bound keeps its fill and its border and fades only its
  // glyph. Faded whole, the decrease button at 0 let the surface behind show
  // through and read as a dark hole in the control. A disabled control fades
  // as one, from its row.
  const step_ =
    `${HIT_AREA} flex w-control shrink-0 items-center justify-center border-line-strong bg-surface-2 text-muted coarse:w-8 ` +
    'transition-colors hover:bg-line hover:text-fg ' +
    'disabled:text-faint disabled:hover:bg-surface-2 disabled:cursor-not-allowed ' +
    'coarse:before:translate-x-0 coarse:before:-translate-y-1/2';
</script>

<div
  data-field
  data-no-ai={noAI ? '' : undefined}
  class="{FIELD_WRAP} {cls}{assist.pending ? ASSIST_WRAP : ''}"
>
  {#if label}
    <AssistRow field={assist}>
      <FieldLabel for={fieldId} text={label} {required} {assist} />
    </AssistRow>
  {/if}

  <div class="flex h-control{disabled ? ' opacity-50' : ''}">
    <button
      type="button"
      onclick={dec}
      disabled={!canDec}
      aria-label={label ? `Decrease ${inSentence(label)}` : 'Decrease'}
      class="{step_} rounded-s-lg border border-e-0 coarse:before:start-auto coarse:before:end-0"
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
        outline-none transition-colors
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35
        disabled:cursor-not-allowed
        [appearance:textfield]
        [&::-webkit-inner-spin-button]:appearance-none
        [&::-webkit-outer-spin-button]:appearance-none
        {controlBorder(!!error, assist.suggested)}"
    />

    <button
      type="button"
      onclick={inc}
      disabled={!canInc}
      aria-label={label ? `Increase ${inSentence(label)}` : 'Increase'}
      class="{step_} rounded-e-lg border border-s-0 coarse:before:start-0 coarse:before:end-auto"
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

  <FieldMessage base={fieldId} {error} {hint} />
</div>
