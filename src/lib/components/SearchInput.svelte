<script lang="ts">
  import { CONTROL_BASE, FIELD_LABEL, FIELD_WRAP, controlBorder } from '../internal/field.js';

  interface Props {
    value?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    class?: string;
    oninput?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    label = undefined,
    placeholder = 'Search…',
    disabled = false,
    id = undefined,
    name = undefined,
    class: cls = '',
    oninput = undefined,
  }: Props = $props();

  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined));

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    value = e.currentTarget.value;
    oninput?.(value);
  }

  function clear() {
    value = '';
    oninput?.('');
  }
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>{label}</label>
  {/if}

  <div class="relative">
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
      id={fieldId}
      {name}
      {placeholder}
      {disabled}
      {value}
      oninput={handleInput}
      class="{CONTROL_BASE} {controlBorder(false)} pl-9
        [&::-webkit-search-cancel-button]:appearance-none
        {value ? 'pr-8' : 'pr-3'}"
    />

    {#if value}
      <button
        type="button"
        onclick={clear}
        aria-label="Clear search"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint
          transition-colors duration-150 hover:text-fg"
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
</div>
