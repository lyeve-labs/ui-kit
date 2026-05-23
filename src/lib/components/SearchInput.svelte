<script lang="ts">
  interface Props {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    oninput?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Search…',
    disabled = false,
    class: cls = '',
    oninput = undefined,
  }: Props = $props();

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    value = e.currentTarget.value;
    oninput?.(value);
  }

  function clear() {
    value = '';
    oninput?.('');
  }
</script>

<div class="relative {cls}">
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>

  <input
    type="search"
    {placeholder}
    {disabled}
    {value}
    oninput={handleInput}
    class="w-full rounded-lg border border-line bg-surface-2
      py-2 pl-9 text-sm text-fg placeholder:text-faint
      focus:border-brand focus:outline-none transition-colors
      disabled:cursor-not-allowed disabled:opacity-50
      [&::-webkit-search-cancel-button]:appearance-none
      {value ? 'pr-8' : 'pr-3'}"
  />

  {#if value}
    <button
      type="button"
      onclick={clear}
      aria-label="Clear search"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint
        transition-colors hover:text-fg"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>
