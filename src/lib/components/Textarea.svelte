<script lang="ts">
  import {
    CONTROL_MULTILINE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
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
     * Monospace for the control alone: code, JSON, a key. Passing `font-mono`
     * as a class reached the wrapper, so the label and the hint turned
     * monospace with it.
     */
    mono?: boolean;
    class?: string;
    oninput?: (e: TAE) => void;
    onblur?: (e: FocusEvent & { currentTarget: TA }) => void;
  } = $props();

  // $props.id() and not the label: two fields under one label on a page took
  // one id, and both labels named the first control. It also matches between
  // the server render and hydration, which a random string would not.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);
</script>

<div data-field class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ms-0.5" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

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
    class="{CONTROL_MULTILINE} {controlBorder(!!error)} {resize ? 'resize-y' : 'resize-none'} {mono
      ? 'font-mono'
      : ''}"
    bind:value
    {oninput}
    {onblur}
  ></textarea>

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
