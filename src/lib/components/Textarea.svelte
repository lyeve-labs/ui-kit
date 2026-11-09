<script lang="ts">
  import FieldMessage from '../internal/FieldMessage.svelte';
  import FieldLabel from '../internal/FieldLabel.svelte';
  import AssistRow from '../internal/AssistRow.svelte';
  import { assistField } from '../internal/assist.svelte.js';
  import {
    ASSIST_WRAP,
    CONTROL_MULTILINE,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';

  type TA = HTMLTextAreaElement;
  type TAE = Event & { currentTarget: TA };

  let {
    value = $bindable(''),
    id,
    name,
    label,
    placeholder,
    rows = 4,
    maxlength,
    required = false,
    disabled = false,
    readonly = false,
    resize = true,
    error,
    hint,
    mono = false,
    class: cls = '',
    oninput,
    onblur,
    noAI = false,
  }: {
    value?: string;
    id?: string;
    name?: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    maxlength?: number;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    resize?: boolean;
    error?: string;
    hint?: string;
    /**
     * Monospace for the control alone: code, JSON, a key. `class` lands on the
     * wrapper, so it cannot do this.
     */
    mono?: boolean;
    class?: string;
    oninput?: (e: TAE) => void;
    onblur?: (e: FocusEvent & { currentTarget: TA }) => void;
    /**
     * Keeps the value from an assistant: a FormAssist never reports it and
     * never fills it. Also marks the control `data-no-ai` for a browser agent.
     */
    noAI?: boolean;
  } = $props();

  // $props.id() and not the label: two fields under one label on a page took
  // one id, and both labels named the first control. It also matches between
  // the server render and hydration, which a random string would not.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

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
    kind: 'multiline',
    get required() {
      return required;
    },
    get noAI() {
      return noAI;
    },
    get value() {
      return value;
    },
    set value(v) {
      value = v as string;
    },
  });
</script>

<div
  data-field
  data-no-ai={noAI ? '' : undefined}
  class="{FIELD_WRAP} {cls}{assist.pending ? ASSIST_WRAP : ''}"
>
  <AssistRow field={assist}>
    {#if label}
      <FieldLabel for={fieldId} text={label} {required} {assist} />
    {/if}
  </AssistRow>

  <textarea
    id={fieldId}
    {name}
    {rows}
    {maxlength}
    {required}
    {disabled}
    {readonly}
    {placeholder}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy(fieldId, error, hint)}
    class="{CONTROL_MULTILINE} {controlBorder(!!error, assist.suggested)} {resize
      ? 'resize-y'
      : 'resize-none'} {mono ? 'font-mono' : ''}"
    bind:value
    {oninput}
    {onblur}
  ></textarea>

  <FieldMessage base={fieldId} {error} {hint} />
</div>
