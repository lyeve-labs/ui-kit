<script lang="ts">
  // Autocomplete (combobox): type to filter a list, navigate with ↑/↓, select with
  // Enter. Binds `value` to the chosen option's value; shows its label in the input.
  interface Option {
    value: string;
    label: string;
    disabled?: boolean;
  }

  let {
    value = $bindable(''),
    options,
    label = undefined,
    hint = undefined,
    error = undefined,
    placeholder = 'Type to search…',
    disabled = false,
    required = false,
    id = undefined,
    name = undefined,
    allowClear = true,
    class: cls = '',
    onchange = undefined,
  }: {
    value?: string;
    options: Option[];
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    allowClear?: boolean;
    class?: string;
    onchange?: (value: string) => void;
  } = $props();

  const uid = `ac-${Math.random().toString(36).slice(2, 9)}`;
  const listId = $derived(id ? `${id}-list` : uid);

  let open = $state(false);
  let query = $state('');
  let active = $state(0); // highlighted index
  let containerEl: HTMLDivElement | undefined = $state();
  let dirty = $state(false); // user is editing the query vs. showing the selected label

  const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');
  const display = $derived(dirty ? query : selectedLabel);
  const filtered = $derived(
    dirty && query.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options,
  );

  function choose(opt: Option) {
    if (opt.disabled) return;
    value = opt.value;
    onchange?.(opt.value);
    query = '';
    dirty = false;
    open = false;
  }

  function clear() {
    value = '';
    query = '';
    dirty = false;
    onchange?.('');
  }

  function onInput(e: Event & { currentTarget: HTMLInputElement }) {
    query = e.currentTarget.value;
    dirty = true;
    open = true;
    active = 0;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open = true;
      active = Math.min(active + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) {
        e.preventDefault();
        choose(filtered[active]);
      }
    } else if (e.key === 'Escape') {
      open = false;
      dirty = false;
      query = '';
    }
  }

  function handleOutside(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      open = false;
      dirty = false;
      query = '';
    }
  }

  $effect(() => {
    if (open) document.addEventListener('click', handleOutside, { capture: true });
    return () => document.removeEventListener('click', handleOutside, { capture: true });
  });
</script>

<div class="flex flex-col gap-1.5 {cls}" bind:this={containerEl}>
  {#if label}
    <label for={id} class="text-sm font-medium text-fg">
      {label}{#if required}<span class="text-danger ml-0.5">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    <input
      {id}
      {name}
      {placeholder}
      {disabled}
      {required}
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      autocomplete="off"
      value={display}
      oninput={onInput}
      onkeydown={onKeydown}
      onfocus={() => (open = true)}
      onblur={() => setTimeout(() => (open = false), 150)}
      class="w-full rounded-lg bg-surface-2 border px-3 py-2 text-sm text-fg placeholder:text-faint
        transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed
        {allowClear && value ? 'pr-8' : 'pr-3'}
        {error ? 'border-danger focus:border-danger' : 'border-line focus:border-brand'}"
    />
    {#if allowClear && value && !disabled}
      <button
        type="button"
        aria-label="Clear"
        onclick={clear}
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-fg leading-none"
        >×</button
      >
    {/if}

    {#if open}
      <div
        id={listId}
        role="listbox"
        class="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-line
          bg-surface shadow-2xl py-1"
      >
        {#each filtered as opt, i (opt.value)}
          <button
            type="button"
            role="option"
            aria-selected={opt.value === value}
            disabled={opt.disabled}
            onmouseenter={() => (active = i)}
            onclick={() => choose(opt)}
            class="w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              {i === active ? 'bg-surface-2' : ''}
              {opt.value === value ? 'text-brand' : 'text-fg'}"
          >
            <span>{opt.label}</span>
            {#if opt.value === value}
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                <path
                  d="M1 5l3.5 3.5L11 1.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </button>
        {:else}
          <p class="px-3 py-2 text-sm text-faint">No matches</p>
        {/each}
      </div>
    {/if}
  </div>

  {#if error}
    <p class="text-xs text-danger">{error}</p>
  {:else if hint}
    <p class="text-xs text-faint">{hint}</p>
  {/if}
</div>
