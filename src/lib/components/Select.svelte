<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';

  type SE = Event & { currentTarget: HTMLSelectElement };

  let {
    value,
    id,
    name,
    label,
    hint,
    required = false,
    disabled = false,
    error,
    class: cls = '',
    onchange,
    children,
  }: {
    value?: string | null;
    id?: string;
    name?: string;
    label?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    class?: string;
    onchange?: (e: SE) => void;
    children?: Snippet;
  } = $props();

  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined));
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    <select
      id={fieldId}
      {name}
      {required}
      {disabled}
      value={value ?? ''}
      {onchange}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      class="{CONTROL_BASE} {controlBorder(!!error)} appearance-none cursor-pointer pr-8"
    >
      {@render children?.()}
    </select>
    <span
      class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint"
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 4l4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>

  {#if error}
    <p id={fieldId ? `${fieldId}-error` : undefined} class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id={fieldId ? `${fieldId}-hint` : undefined} class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
