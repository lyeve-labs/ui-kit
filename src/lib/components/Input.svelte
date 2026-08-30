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

  interface Props {
    value?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    class?: string;
    [key: string]: unknown;
  }

  let {
    value = $bindable(''),
    label = undefined,
    type = 'text',
    placeholder = '',
    hint = undefined,
    error = undefined,
    disabled = false,
    required = false,
    id = undefined,
    class: klass = '',
    ...rest
  }: Props = $props();

  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined));
</script>

<div class="{FIELD_WRAP} {klass}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
    </label>
  {/if}

  <input
    id={fieldId}
    {type}
    {placeholder}
    {disabled}
    {required}
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy(fieldId, error, hint)}
    class="{CONTROL_BASE} {controlBorder(!!error)}"
    {...rest}
  />

  {#if error}
    <p id={fieldId ? `${fieldId}-error` : undefined} class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id={fieldId ? `${fieldId}-hint` : undefined} class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
