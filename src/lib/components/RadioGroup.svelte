<script lang="ts">
  import { FIELD_ERROR, FIELD_HINT, FIELD_LABEL } from '../internal/field.js';
  // RadioGroup renders a managed set of radio options bound to a single value.
  // Matches the visual of Radio.svelte; use this when you have a fixed option list.
  interface Option {
    value: string;
    label: string;
    hint?: string;
    disabled?: boolean;
  }

  let {
    value = $bindable(''),
    options,
    name = undefined,
    label = undefined,
    hint = undefined,
    error = undefined,
    required = false,
    disabled = false,
    orientation = 'vertical',
    class: cls = '',
    onchange = undefined,
  }: {
    value?: string;
    options: Option[];
    name?: string;
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    orientation?: 'vertical' | 'horizontal';
    class?: string;
    onchange?: (value: string) => void;
  } = $props();

  const fallbackName = `rg-${Math.random().toString(36).slice(2, 9)}`;
  const groupName = $derived(name ?? fallbackName);

  function select(opt: Option) {
    if (disabled || opt.disabled) return;
    value = opt.value;
    onchange?.(opt.value);
  }
</script>

<fieldset class="flex flex-col gap-2 {cls}" {disabled}>
  {#if label}
    <legend class="{FIELD_LABEL} mb-0.5">
      {label}{#if required}<span class="text-danger ml-0.5">*</span>{/if}
    </legend>
  {/if}

  <div
    class="flex gap-x-5 gap-y-2 {orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'}"
  >
    {#each options as opt (opt.value)}
      <label
        class="inline-flex cursor-pointer select-none items-start gap-2.5
          {disabled || opt.disabled ? 'cursor-not-allowed opacity-50' : ''}"
      >
        <span class="relative mt-0.5 flex shrink-0 items-center justify-center">
          <input
            type="radio"
            name={groupName}
            value={opt.value}
            disabled={disabled || opt.disabled}
            checked={value === opt.value}
            onchange={() => select(opt)}
            class="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            class="pointer-events-none flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors duration-150
              {value === opt.value
              ? 'border-brand bg-surface-2'
              : 'border-line bg-surface-2 peer-focus-visible:border-brand'}"
          >
            {#if value === opt.value}
              <span class="h-2 w-2 rounded-full bg-brand"></span>
            {/if}
          </span>
        </span>
        <span class="flex flex-col gap-0.5">
          <span class="text-sm text-fg">{opt.label}</span>
          {#if opt.hint}<span class={FIELD_HINT}>{opt.hint}</span>{/if}
        </span>
      </label>
    {/each}
  </div>

  {#if error}
    <p class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p class={FIELD_HINT}>{hint}</p>
  {/if}
</fieldset>
