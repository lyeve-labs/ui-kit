<script lang="ts">
  let {
    checked = $bindable(false),
    label,
    hint,
    disabled = false,
    size = 'md',
    onchange,
  }: {
    checked?: boolean;
    label?: string;
    hint?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    onchange?: (checked: boolean) => void;
  } = $props();

  const track: Record<string, string> = {
    sm: 'w-8 h-4',
    md: 'w-10 h-5',
  };

  const thumb: Record<string, string> = {
    sm: 'w-3 h-3 top-0.5 left-0.5',
    md: 'w-4 h-4 top-0.5 left-0.5',
  };

  const thumbOn: Record<string, string> = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
  };

  function handleClick() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<label
  class="inline-flex items-start gap-2.5 cursor-pointer select-none {disabled
    ? 'opacity-50 cursor-not-allowed'
    : ''}"
>
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label ?? 'Toggle'}
    {disabled}
    onclick={handleClick}
    class="relative shrink-0 rounded-full transition-colors focus:outline-none
      focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1
      focus-visible:ring-offset-ink mt-0.5
      {track[size]}
      {checked ? 'bg-brand' : 'bg-surface-2'}"
  >
    <span
      class="absolute rounded-full bg-white shadow transition-transform
        {thumb[size]}
        {checked ? thumbOn[size] : 'translate-x-0'}"
    ></span>
  </button>
  {#if label || hint}
    <span class="flex flex-col gap-0.5">
      {#if label}
        <span class="text-sm text-fg">{label}</span>
      {/if}
      {#if hint}
        <span class="text-xs text-faint">{hint}</span>
      {/if}
    </span>
  {/if}
</label>
