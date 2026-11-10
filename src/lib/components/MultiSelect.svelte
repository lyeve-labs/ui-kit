<script lang="ts">
  import FieldMessage from '../internal/FieldMessage.svelte';
  import FieldLabel from '../internal/FieldLabel.svelte';
  import AssistRow from '../internal/AssistRow.svelte';
  import { assistField } from '../internal/assist.svelte.js';
  import { ChevronDown, X } from '@lucide/svelte';
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
  import { HIT_AREA } from '../internal/touch.js';
  import { ASSIST_WRAP, FIELD_WRAP, FRAME_HOVER, describedBy } from '../internal/field.js';
  import { createListbox } from '../internal/listbox.svelte.js';
  import {
    PANEL_EMPTY,
    PANEL_LIST,
    PANEL_SURFACE,
    panelOption,
    PANEL_SEARCH,
    placePanel,
  } from '../internal/panel.js';
  import * as motion from '../motion.js';
  import { CHOICE_MARK } from '../internal/choice.js';
  import type { ListOption } from '../internal/listbox.svelte.js';

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
    /** Posts each chosen value under this name, as a multiple select does. */
    name?: string;
    /**
     * Keeps the value from an assistant: a FormAssist never reports it and
     * never fills it. Also marks the control `data-no-ai` for a browser agent.
     */
    noAI?: boolean;
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
    placeholder = 'None selected',
    searchable = true,
    disabled = false,
    required = false,
    id = undefined,
    name = undefined,
    noAI = false,
    filter = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  const assist = assistField({
    get name() {
      return name;
    },
    get label() {
      return label;
    },
    get hint() {
      return hint;
    },
    kind: 'choices',
    get required() {
      return required;
    },
    get noAI() {
      return noAI;
    },
    get options() {
      return options.map(({ value, label, disabled }) => ({ value, label, disabled }));
    },
    get value() {
      return value;
    },
    set value(v) {
      value = v as string[];
    },
  });

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
    if (disabled) return;
    value = value.filter((x) => x !== v);
    onchange?.(value);
    // The pressed button leaves with its chip, and focus would fall to the
    // page. The field is where the reader was.
    triggerEl?.focus();
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

  function onFrameClick(): void {
    if (disabled) return;
    triggerEl?.focus();
    box.toggle();
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (disabled) return;
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

<div
  data-field
  data-no-ai={noAI ? '' : undefined}
  class="{FIELD_WRAP} {cls}{assist.pending ? ASSIST_WRAP : ''}"
>
  <AssistRow field={assist}>
    {#if label}
      <FieldLabel id="{fieldId}-label" for={fieldId} text={label} {required} {assist} />
    {/if}
  </AssistRow>

  <div class="relative" use:anchor>
    <!--
      The frame draws the field. The chips and the combobox sit inside it side
      by side, so no remove button is a control nested inside another control,
      which a screen reader reads as one widget and a keyboard cannot sort
      out. A press anywhere on the frame that is not a remove button opens the
      list from the combobox, as a press on the field always did.

      Under a finger each remove cross takes a 44px box on a 20px chip, which
      reaches 12px above and below the chip and 8px past its end. The chips
      sit 8px apart there and their rows 24px apart, so no box covers the
      next chip or the row below, and a tap meant to open the list lands on
      the field. The frame pads its chips 11px from its border there, so the
      boxes of the top and bottom rows stay inside the field, and one row
      still fills the 44px control height.
    -->
    <div
      role="presentation"
      onclick={onFrameClick}
      class="relative flex min-h-control w-full cursor-pointer flex-wrap items-center gap-1.5 coarse:gap-x-2 coarse:gap-y-6 rounded-lg
        border bg-surface-2 py-1.5 coarse:py-2.75 ps-2.5 pe-7 text-start text-sm transition-colors
        has-[[role=combobox]:focus-visible]:ring-2 has-[[role=combobox]:focus-visible]:ring-inset
        has-[[role=combobox]:focus-visible]:ring-focus/50
        {disabled ? 'cursor-not-allowed opacity-50' : ''}
        {error
        ? 'border-danger'
        : assist.suggested
          ? 'border-violet has-[[role=combobox]:focus]:border-violet'
          : `border-line ${FRAME_HOVER} has-[[role=combobox]:focus]:border-focus`}"
    >
      <!--
        A div and not an input: there is nothing to type here. The labels of
        the chosen values are its text, so focusing it reads the label and
        then what is chosen, as a select reads its value. It comes first in
        the markup, so Tab reaches the field before any remove button, and it
        spans the frame as the field itself, so it comes first on screen too.
        A press on a chip lands on it. The remove buttons are positioned and
        later in the markup, so they sit above it and take their own presses.
        The frame keeps room at its end for the chevron.
      -->
      <div
        bind:this={triggerEl}
        id={fieldId}
        role="combobox"
        tabindex={disabled ? -1 : 0}
        aria-disabled={disabled ? 'true' : undefined}
        aria-labelledby={label ? `${fieldId}-label` : undefined}
        aria-required={required ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        onkeydown={onTriggerKeydown}
        {...box.triggerAttrs}
        class="absolute inset-0 flex items-center gap-1.5 rounded-lg px-2.5 outline-none"
      >
        {#if selected.length === 0}
          <span class="min-w-0 truncate px-0.5 text-faint">{placeholder}</span>
        {:else}
          <span class="sr-only">{selected.map((option) => option.label).join(', ')}</span>
        {/if}
        <span class="ms-auto shrink-0 text-faint" aria-hidden="true">
          <ChevronDown
            size={12}
            absoluteStrokeWidth
            strokeWidth={1.5}
            class="transition-transform duration-base {box.open ? 'rotate-180' : ''}"
            aria-hidden="true"
          />
        </span>
      </div>
      {#each selected as option (option.value)}
        <span
          class="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-xs text-brand"
        >
          <!-- The combobox reads the chosen labels, so the chip's copy is
               hidden rather than read twice. Its button names the value. -->
          <span aria-hidden="true">{option.label}</span>
          <button
            type="button"
            aria-label="Remove {option.label}"
            aria-disabled={disabled ? 'true' : undefined}
            tabindex={disabled ? -1 : undefined}
            onclick={(event) => {
              event.stopPropagation();
              remove(option.value);
            }}
            class="{HIT_AREA} -m-1.5 p-1.5 transition-colors hover:text-brand-light"
          >
            <!--
              12px inside 6px of padding is a 24px target, which is the floor
              SC 2.5.8 puts on a control that cannot claim the spacing
              exception, and this one sits inside the field. The padding is
              taken straight back off as margin, so the chip is laid out
              exactly as it was and only the reachable area grew. The glyph
              is the same 12px cross Autocomplete clears its value with. It
              was drawn a pixel smaller here for no reason anyone recorded.
            -->
            <X size={12} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </span>
      {/each}
    </div>
    {#if name}
      {#each value as chosen (chosen)}
        <input type="hidden" {name} value={chosen} />
      {/each}
    {/if}

    {#if box.open}
      <div use:placePanel transition:motion.popover|global class="{PANEL_SURFACE} w-full">
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
              class={PANEL_SEARCH}
            />
          </div>
        {/if}

        <div
          class={PANEL_LIST}
          data-panel-list
          use:panel
          {...box.listAttrs}
          aria-multiselectable="true"
        >
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
                  transition-colors
                  {isSelected
                  ? 'border-brand bg-brand text-ink'
                  : 'border-line-strong bg-surface-2'}"
              >
                {#if isSelected}
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                    <path
                      d={CHOICE_MARK.check}
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                {/if}
              </span>
              <span class="min-w-0 truncate text-start">{option.label}</span>
            </button>
          {:else}
            <p class={PANEL_EMPTY}>No matches</p>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <FieldMessage base={fieldId} {error} {hint} />
</div>
