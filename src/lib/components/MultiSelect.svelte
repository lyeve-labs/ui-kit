<script lang="ts">
  /**
   * Several values from one list, shown as removable chips, with an optional
   * search box in the panel.
   *
   * The open state, the active row, the keyboard model and the dismissal come
   * from internal/listbox, the matching from internal/filter and every class in
   * the panel from internal/panel. A pick leaves the list open, which is the
   * reason the factory reports a selection rather than closing on one.
   */
  import { applyFilter, type FilterInput } from '../internal/filter.js';
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';
  import { createListbox } from '../internal/listbox.svelte.js';
  import { PANEL_EMPTY, PANEL_LIST, PANEL_SURFACE, panelOption } from '../internal/panel.js';
  import type { ListOption } from './Autocomplete.svelte';

  interface Props {
    /** The chosen values, in the order they were picked. */
    value?: string[];
    options: ListOption[];
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    /** Adds a search field inside the panel. */
    searchable?: boolean;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    /**
     * Replaces the default matcher, or false to switch local filtering off
     * because the list arrived already narrowed, by a server query for instance.
     */
    filter?: FilterInput<ListOption>;
    class?: string;
    onchange?: (value: string[]) => void;
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
    filter = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  /*
   * $props.id() and not a random string: a random id differs between the server
   * render and hydration, so every idref built from it names an element the
   * client never rendered. The trigger, the panel and each row are tied
   * together by this one.
   */
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  let query = $state('');
  let triggerEl = $state<HTMLDivElement | undefined>();
  let searchEl = $state<HTMLInputElement | undefined>();

  const chosen = $derived(new Set(value));
  const selected = $derived(options.filter((option) => chosen.has(option.value)));
  const rows = $derived(applyFilter(options, query, filter));

  const box = createListbox<ListOption>({
    items: () => rows,
    baseId: () => fieldId,
    onSelect: (option) => pick(option),
    // A search box makes letters query text, so the two typeaheads cannot both
    // own them. Without one, typing jumps to a row the way a select does.
    typeahead: () => !searchable,
    onClose: (reason) => {
      query = '';
      // Tab is the one dismissal that leaves focus inside a panel about to be
      // unmounted: the module hands the key on rather than consuming it, so the
      // browser is about to move focus from wherever it finds it.
      if (reason === 'tab') triggerEl?.focus();
    },
  });

  const anchor = box.anchor;
  const panel = box.panel;

  function pick(option: ListOption): void {
    if (option.disabled === true) return;
    value = chosen.has(option.value)
      ? value.filter((v) => v !== option.value)
      : [...value, option.value];
    onchange?.(value);
  }

  function remove(v: string): void {
    value = value.filter((x) => x !== v);
    onchange?.(value);
  }

  function search(event: Event & { currentTarget: HTMLInputElement }): void {
    query = event.currentTarget.value;
    // The keyboard must not rest on a row the new query pushed out from under
    // it: aria-activedescendant would name one option while the ring is drawn
    // on another. Cleared first, so openList lands on the first row that still
    // matches rather than on whatever now sits at the old index.
    box.setActive(-1);
    box.openList();
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (disabled) return;
    // A chip's remove button sits inside the trigger, so its keys bubble
    // through here. Taken as the trigger's own they would open the panel and
    // preventDefault the click that removes the chip.
    if (event.target !== event.currentTarget) return;
    if (box.onkeydown(event)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    // The trigger owns these two only while the list is closed. Open, Enter
    // belongs to the listbox and Space means the same thing it does: take the
    // row the ring is resting on.
    event.preventDefault();
    if (!box.open) {
      box.openList();
      return;
    }
    const option = rows[box.activeIndex];
    if (option !== undefined) pick(option);
  }

  /*
   * Focus moves into the panel deliberately, and it comes back: Escape returns
   * it to the trigger through the shared module, and Tab hands it back above.
   * The attribute this replaces did the first half and none of the second, and
   * the warning it raised was suppressed with an ignore comment rather than
   * answered.
   */
  $effect(() => {
    if (box.open && searchEl !== undefined) searchEl.focus();
  });
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label id="{fieldId}-label" for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="ml-0.5 text-danger" aria-label="required">*</span>{/if}
    </label>
  {/if}

  <div class="relative" use:anchor>
    <!--
      A div and not a button, so the chips' own remove buttons are valid
      children. role="combobox" and not role="button" for the same reason: a
      button's descendants are presentational, which took every remove button
      out of the accessibility tree, and aria-activedescendant says nothing on a
      role that does not support it.
    -->
    <div
      bind:this={triggerEl}
      id={fieldId}
      role="combobox"
      tabindex={disabled ? -1 : 0}
      aria-disabled={disabled ? 'true' : undefined}
      aria-labelledby={label ? `${fieldId}-label` : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      onclick={() => {
        if (!disabled) box.toggle();
      }}
      onkeydown={onTriggerKeydown}
      {...box.triggerAttrs}
      class="flex min-h-control w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg
        border bg-surface-2 px-2.5 py-1.5 text-left text-sm transition-colors duration-150
        outline-none {disabled ? 'cursor-not-allowed opacity-50' : ''} {controlBorder(!!error)}"
    >
      {#if selected.length === 0}
        <span class="px-0.5 text-faint">{placeholder}</span>
      {:else}
        {#each selected as option (option.value)}
          <span
            class="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-xs text-brand"
          >
            {option.label}
            <button
              type="button"
              aria-label="Remove {option.label}"
              onclick={(event) => {
                event.stopPropagation();
                remove(option.value);
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
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          class="transition-transform duration-150 {box.open ? 'rotate-180' : ''}"
        >
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

    {#if box.open}
      <div class="{PANEL_SURFACE} w-full">
        {#if searchable}
          <div class="border-b border-line p-2">
            <input
              bind:this={searchEl}
              type="text"
              role="combobox"
              value={query}
              oninput={search}
              onkeydown={(event) => {
                box.onkeydown(event);
              }}
              placeholder="Search"
              aria-label={label ? `Search ${label}` : 'Search options'}
              {...box.triggerAttrs}
              class="w-full rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5
                text-sm text-fg outline-none transition-colors duration-150
                placeholder:text-faint focus:border-brand"
            />
          </div>
        {/if}

        <div class={PANEL_LIST} use:panel {...box.listAttrs} aria-multiselectable="true">
          {#each rows as option, index (option.value)}
            {@const isSelected = chosen.has(option.value)}
            <!--
              role is stated here as well as spread. The compiler checks
              aria-selected against the role it can see in the source and it
              cannot see into a spread, so without this the row reads to it as a
              plain button carrying an attribute a button does not support.
            -->
            <button
              type="button"
              role="option"
              onclick={() => pick(option)}
              onmouseenter={() => box.setActive(index)}
              onmousedown={(event) => {
                // Pressing a row must not pull focus out of the search box: the
                // list stays open for the next pick, and the caret stays where
                // the user was typing.
                event.preventDefault();
              }}
              aria-selected={isSelected ? 'true' : 'false'}
              {...box.optionAttrs(index)}
              class={panelOption({
                active: box.activeIndex === index,
                selected: isSelected,
                disabled: option.disabled === true,
              })}
            >
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded border
                  transition-colors duration-150
                  {isSelected
                  ? 'border-brand bg-brand text-ink'
                  : 'border-line-strong bg-surface-2'}"
              >
                {#if isSelected}
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                    <path
                      d="M1 4l3 3 5-6"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                {/if}
              </span>
              <span class="min-w-0 truncate text-left">{option.label}</span>
            </button>
          {:else}
            <p class={PANEL_EMPTY}>No matches</p>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
