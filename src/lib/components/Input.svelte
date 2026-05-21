<script lang="ts">
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

<div class="flex flex-col gap-1.5 {klass}">
  {#if label}
    <label for={fieldId} class="text-sm font-medium text-fg">
      {label}{#if required}<span class="text-danger ml-0.5">*</span>{/if}
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
    class="w-full rounded-lg bg-surface-2 border px-3 py-2 text-sm text-fg placeholder:text-faint
           transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed
           {error
      ? 'border-danger focus:border-danger'
      : 'border-line focus:border-brand'}"
    {...rest}
  />

  {#if error}
    <p class="text-xs text-danger">{error}</p>
  {:else if hint}
    <p class="text-xs text-faint">{hint}</p>
  {/if}
</div>
