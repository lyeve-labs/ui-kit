<script lang="ts">
  interface Props {
    value: string;
    group?: string;
    label?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    name?: string;
    onchange?: (value: string) => void;
  }

  let {
    value,
    group = $bindable(''),
    label = undefined,
    hint = undefined,
    required = false,
    disabled = false,
    id = undefined,
    name = undefined,
    onchange = undefined,
  }: Props = $props();

  function handleChange() {
    group = value;
    onchange?.(value);
  }
</script>

<label
  class="inline-flex cursor-pointer select-none items-start gap-2.5
    {disabled ? 'cursor-not-allowed opacity-50' : ''}"
>
  <span class="relative mt-0.5 flex shrink-0 items-center justify-center">
    <input
      type="radio"
      {id}
      {name}
      {value}
      {required}
      {disabled}
      checked={group === value}
      onchange={handleChange}
      class="peer sr-only"
    />
    <span
      class="flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors
        {group === value
        ? 'border-brand bg-surface-2'
        : 'border-line bg-surface-2 peer-focus-visible:border-brand'}"
    >
      {#if group === value}
        <span class="h-2 w-2 rounded-full bg-brand"></span>
      {/if}
    </span>
  </span>
  {#if label || hint}
    <span class="flex flex-col gap-0.5">
      {#if label}<span class="text-sm text-fg">{label}</span>{/if}
      {#if hint}<span class="text-xs text-faint">{hint}</span>{/if}
    </span>
  {/if}
</label>
