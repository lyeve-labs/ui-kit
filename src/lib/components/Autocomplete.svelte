<script lang="ts" module>
  import type { ListboxItem } from '../internal/listbox.svelte.js';

  /**
   * One row of a filterable option list.
   *
   * Declared here and imported by MultiSelect, which carried the same interface
   * written out character for character. Two declarations are two chances to
   * answer the same question differently, and these two had already drifted
   * apart in what they let a consumer say: neither could describe a row by
   * anything but its label, so an option a user knows by a code or a synonym
   * could not be found by typing it.
   */
  export interface ListOption extends ListboxItem {
    /**
     * Extra words the default matcher searches alongside the label. Absent on
     * every option that ships today, so adopting it narrows no existing list.
     */
    keywords?: readonly string[];
  }
</script>

<script lang="ts">
  /**
   * A combobox: type to narrow the list, arrow through what is left, Enter to
   * choose.
   *
   * The open state, the active row, the keyboard model and the dismissal come
   * from internal/listbox, the matching from internal/filter and every class in
   * the panel from internal/panel. What stays here is the one thing a combobox
   * owns: whether the input is showing a query being typed or the label of the
   * row already chosen.
   */
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';
  import { applyFilter, type FilterInput } from '../internal/filter.js';
  import { createListbox } from '../internal/listbox.svelte.js';
  import { PANEL_EMPTY, PANEL_LIST, PANEL_SURFACE, panelOption } from '../internal/panel.js';

  interface Props {
    /** The chosen option's value. Empty for none. */
    value?: string;
    options: ListOption[];
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    /** Offers a button that empties the field. */
    allowClear?: boolean;
    /**
     * Replaces the default matcher, or false to switch local filtering off
     * because the list arrived already narrowed, by a server query for instance.
     */
    filter?: FilterInput<ListOption>;
    class?: string;
    onchange?: (value: string) => void;
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
    filter = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  /*
   * $props.id() and not a random string: a random id differs between the server
   * render and hydration, so the aria-controls this field emitted named an
   * element the client had never rendered and the relationship was dropped in
   * silence. Every idref in the panel is built from this one.
   */
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  let query = $state('');
  /** Whether the input holds a query being typed or the chosen row's label. */
  let dirty = $state(false);
  let inputEl = $state<HTMLInputElement | undefined>();
  let fieldEl = $state<HTMLDivElement | undefined>();

  const selectedLabel = $derived(options.find((option) => option.value === value)?.label ?? '');
  const display = $derived(dirty ? query : selectedLabel);
  // Not narrowed until the user types: opening the field shows the whole list,
  // with the row already chosen under the ring.
  const rows = $derived(applyFilter(options, dirty ? query : '', filter));

  // No typeahead: every letter here is query text, and a second matcher jumping
  // the active row would fight the filter for the same keys.
  const box = createListbox<ListOption>({
    items: () => rows,
    baseId: () => fieldId,
    onSelect: (option) => choose(option),
    onClose: () => {
      // The input goes back to showing what is chosen. A dismissed query left
      // on screen reads as a value the field does not hold.
      query = '';
      dirty = false;
    },
  });

  const anchor = box.anchor;
  const panel = box.panel;

  function choose(option: ListOption): void {
    if (option.disabled === true) return;
    value = option.value;
    onchange?.(option.value);
    // The factory leaves the list open, because a multi-value control collects
    // several picks in one pass. This one takes a single value.
    box.close('select');
  }

  function clear(): void {
    value = '';
    query = '';
    dirty = false;
    onchange?.('');
    // The button is about to unmount with focus on it, which would drop focus
    // to the body and leave a keyboard user at the top of the page.
    inputEl?.focus();
  }

  function search(event: Event & { currentTarget: HTMLInputElement }): void {
    query = event.currentTarget.value;
    dirty = true;
    // The keyboard must not rest on a row the new query pushed out from under
    // it: aria-activedescendant would name one option while the ring is drawn
    // on another. Cleared first, so openList lands on the first row that still
    // matches rather than on whatever now sits at the old index.
    box.setActive(-1);
    box.openList();
  }

  function onFocus(event: FocusEvent): void {
    // Focus arriving from inside the field is focus coming back, not the user
    // entering it. Escape hands focus from a row to the input, and reopening on
    // that would undo the dismissal the user had just asked for.
    const from = event.relatedTarget;
    if (from instanceof Node && fieldEl?.contains(from) === true) return;

    // Opening on the row the field already holds, so the first ArrowDown moves
    // from the current value rather than from the top of the list.
    const index = rows.findIndex((option) => option.value === value);
    box.openList(index >= 0 ? index : undefined);
  }
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="ml-0.5 text-danger" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <div class="relative" bind:this={fieldEl} use:anchor>
    <input
      bind:this={inputEl}
      id={fieldId}
      {name}
      {placeholder}
      {disabled}
      {required}
      role="combobox"
      aria-autocomplete="list"
      autocomplete="off"
      value={display}
      oninput={search}
      onfocus={onFocus}
      onkeydown={(event) => {
        box.onkeydown(event);
      }}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      {...box.triggerAttrs}
      class="{CONTROL_BASE} {controlBorder(!!error)} {allowClear && value ? 'pr-8' : 'pr-3'}"
    />

    {#if allowClear && value && !disabled}
      <button
        type="button"
        aria-label="Clear"
        onclick={clear}
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition-colors duration-150 hover:text-fg"
      >
        <svg
          width="12"
          height="12"
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
    {/if}

    {#if box.open}
      <div class="{PANEL_SURFACE} w-full">
        <div class={PANEL_LIST} use:panel {...box.listAttrs}>
          {#each rows as option, index (option.value)}
            {@const isSelected = option.value === value}
            <!--
              role is stated here as well as spread. The compiler checks
              aria-selected against the role it can see in the source and it
              cannot see into a spread, so without this the row reads to it as a
              plain button carrying an attribute a button does not support.
            -->
            <button
              type="button"
              role="option"
              onclick={() => choose(option)}
              onmouseenter={() => box.setActive(index)}
              onmousedown={(event) => {
                // Pressing a row must not pull focus out of the input: the
                // caret stays where the user is typing, and the field never
                // has to be given focus back after a pick.
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
              <span class="min-w-0 truncate">{option.label}</span>
              {#if isSelected}
                <svg
                  width="12"
                  height="10"
                  viewBox="0 0 12 10"
                  fill="none"
                  class="ml-auto shrink-0"
                  aria-hidden="true"
                >
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
