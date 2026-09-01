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
    class?: string;
    oninput?: (e: TAE) => void;
    onblur?: (e: FocusEvent & { currentTarget: TA }) => void;
  } = $props();

  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined));
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
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
    class="{CONTROL_MULTILINE} {controlBorder(!!error)} {resize ? 'resize-y' : 'resize-none'}"
    bind:value
    {oninput}
    {onblur}
  ></textarea>

  {#if error}
    <p id={fieldId ? `${fieldId}-error` : undefined} class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id={fieldId ? `${fieldId}-hint` : undefined} class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
