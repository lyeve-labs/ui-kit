<script lang="ts">
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';
  // MultiSelect: pick several options, shown as removable chips, with an optional
  // search box. Binds to a string[] of selected values.
  interface Option {
    value: string;
    label: string;
    disabled?: boolean;
  }

  let {
    value = $bindable<string[]>([]),
    options,
    label = undefined,
    hint = undefined,
    error = undefined,
    placeholder = 'Select…',
    searchable = true,
    disabled = false,
    required = false,
    id = undefined,
    class: cls = '',
    onchange = undefined,
  }: {
    value?: string[];
    options: Option[];
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    class?: string;
    onchange?: (value: string[]) => void;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let containerEl: HTMLDivElement | undefined = $state();

  const selected = $derived(options.filter((o) => value.includes(o.value)));
  const filtered = $derived(
    options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())),
  );

  function isSelected(v: string) {
    return value.includes(v);
  }

  function toggle(opt: Option) {
    if (opt.disabled) return;
    value = isSelected(opt.value) ? value.filter((v) => v !== opt.value) : [...value, opt.value];
    onchange?.(value);
  }

  function remove(v: string) {
    value = value.filter((x) => x !== v);
    onchange?.(value);
  }

  function open_() {
    if (!disabled) open = true;
  }

  function handleOutside(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      open = false;
      query = '';
    }
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleOutside, { capture: true });
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('click', handleOutside, { capture: true });
      document.removeEventListener('keydown', handleKey);
    };
  });
</script>

<div class="{FIELD_WRAP} {cls}" bind:this={containerEl}>
  {#if label}
    <label for={id} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    <!-- Trigger (a div, not a button, so the chip remove-buttons are valid children) -->
    <div
      {id}
      role="button"
      tabindex={disabled ? -1 : 0}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-disabled={disabled}
      onclick={() => (open ? (open = false) : open_())}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open ? (open = false) : open_();
        }
      }}
      aria-describedby={describedBy(id, error, hint)}
      class="w-full min-h-control flex flex-wrap items-center gap-1.5 rounded-lg border bg-surface-2
        px-2.5 py-1.5 text-left text-sm transition-colors duration-150 outline-none cursor-pointer
        {disabled ? 'opacity-50 cursor-not-allowed' : ''}
        {controlBorder(!!error)}"
    >
      {#if selected.length === 0}
        <span class="text-faint px-0.5">{placeholder}</span>
      {:else}
        {#each selected as opt (opt.value)}
          <span
            class="inline-flex items-center gap-1 rounded-md bg-brand/10 text-brand px-2 py-0.5 text-xs"
          >
            {opt.label}
            <button
              type="button"
              aria-label="Remove {opt.label}"
              onclick={(e) => {
                e.stopPropagation();
                remove(opt.value);
              }}
              class="transition-colors duration-150 hover:text-brand-light"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        {/each}
      {/if}
      <span class="ml-auto shrink-0 text-faint" aria-hidden="true">
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

    <!-- Panel -->
    {#if open}
      <div
        role="listbox"
        aria-multiselectable="true"
        class="absolute z-50 mt-1 w-full rounded-xl border border-line bg-surface shadow-2xl overflow-hidden"
      >
        {#if searchable}
          <div class="p-2 border-b border-line">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              autofocus
              bind:value={query}
              placeholder="Search…"
              class="w-full rounded-md bg-surface-2 border border-line px-2.5 py-1.5 text-sm text-fg
                placeholder:text-faint outline-none focus:border-brand"
            />
          </div>
        {/if}
        <div class="max-h-60 overflow-y-auto py-1">
          {#each filtered as opt (opt.value)}
            <button
              type="button"
              role="option"
              aria-selected={isSelected(opt.value)}
              disabled={opt.disabled}
              onclick={() => toggle(opt)}
              class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-fg transition-colors duration-150
                hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed
                outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
            >
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150
                  {isSelected(opt.value) ? 'bg-brand border-brand' : 'bg-surface-2 border-line'}"
              >
                {#if isSelected(opt.value)}
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
              <span class="text-left">{opt.label}</span>
            </button>
          {:else}
            <p class="px-3 py-2 text-sm text-faint">No matches</p>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if error}
    <p id={id ? `${id}-error` : undefined} class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id={id ? `${id}-hint` : undefined} class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
