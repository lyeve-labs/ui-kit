<script lang="ts">
  import { FIELD_HINT } from '../internal/field.js';
  let {
    checked = $bindable(false),
    label,
    hint,
    required = false,
    disabled = false,
    id,
    name,
    value,
    class: cls = '',
    onchange,
  }: {
    checked?: boolean;
    label?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    name?: string;
    value?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
  } = $props();

  function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
    checked = e.currentTarget.checked;
    onchange?.(checked);
  }
</script>

<label
  class="inline-flex items-start gap-2.5 cursor-pointer select-none {disabled
    ? 'opacity-50 cursor-not-allowed'
    : ''} {cls}"
>
  <span class="relative flex items-center justify-center mt-0.5 shrink-0">
    <input
      type="checkbox"
      {id}
      {name}
      {value}
      {required}
      {disabled}
      {checked}
      onchange={handleChange}
      class="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
    <span
      class="pointer-events-none w-4 h-4 rounded border transition-colors duration-150 flex items-center justify-center
        {checked
        ? 'bg-brand border-brand'
        : 'bg-surface-2 border-line peer-focus-visible:border-brand'}"
    >
      {#if checked}
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path
            d="M1 4l3 3 5-6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-ink"
          />
        </svg>
      {/if}
    </span>
  </span>
  {#if label || hint}
    <span class="flex flex-col gap-0.5">
      {#if label}
        <span class="text-sm text-fg">
          {label}
          {#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
        </span>
      {/if}
      {#if hint}
        <span class={FIELD_HINT}>{hint}</span>
      {/if}
    </span>
  {/if}
</label>
