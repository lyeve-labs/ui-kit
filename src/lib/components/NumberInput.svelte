<script lang="ts">
  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    id?: string;
    name?: string;
    error?: string;
    class?: string;
    onchange?: (v: number) => void;
  }

  let {
    value = $bindable(0),
    min = undefined,
    max = undefined,
    step = 1,
    disabled = false,
    id = undefined,
    name = undefined,
    error = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  function dec() {
    const next = value - step;
    if (min !== undefined && next < min) return;
    value = next;
    onchange?.(value);
  }

  function inc() {
    const next = value + step;
    if (max !== undefined && next > max) return;
    value = next;
    onchange?.(value);
  }

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    const n = parseFloat(e.currentTarget.value);
    if (!isNaN(n)) {
      value = n;
      onchange?.(n);
    }
  }

  let canDec = $derived(!(disabled || (min !== undefined && value <= min)));
  let canInc = $derived(!(disabled || (max !== undefined && value >= max)));
</script>

<div class="flex flex-col gap-1 {cls}">
  <div class="flex h-9">
    <button
      type="button"
      onclick={dec}
      disabled={!canDec}
      aria-label="Decrease"
      class="flex w-9 shrink-0 items-center justify-center rounded-l-lg border border-r-0 border-line
        bg-surface-2 text-lg leading-none text-muted transition-colors
        hover:bg-line hover:text-fg
        disabled:cursor-not-allowed disabled:opacity-40"
    >−</button>

    <input
      type="number"
      {id}
      {name}
      {min}
      {max}
      {step}
      {disabled}
      value={value}
      oninput={handleInput}
      class="min-w-0 flex-1 border-y bg-surface-2 text-center text-sm text-fg
        focus:outline-none focus:border-brand transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        [appearance:textfield]
        [&::-webkit-inner-spin-button]:appearance-none
        [&::-webkit-outer-spin-button]:appearance-none
        {error ? 'border-danger' : 'border-line'}"
    />

    <button
      type="button"
      onclick={inc}
      disabled={!canInc}
      aria-label="Increase"
      class="flex w-9 shrink-0 items-center justify-center rounded-r-lg border border-l-0 border-line
        bg-surface-2 text-lg leading-none text-muted transition-colors
        hover:bg-line hover:text-fg
        disabled:cursor-not-allowed disabled:opacity-40"
    >+</button>
  </div>
  {#if error}<p class="text-xs text-danger">{error}</p>{/if}
</div>
