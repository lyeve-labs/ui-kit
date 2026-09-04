<script lang="ts" module>
  import type { Component } from 'svelte';

  /**
   * The event a native select hands its change handler.
   *
   * Frozen, and it stays frozen. Every call site in the estate passes an
   * unannotated arrow whose parameter is contextually typed from this prop, and
   * several of them read `e.currentTarget.value` or call
   * `e.currentTarget.form.requestSubmit()`. Retyping the callback to take a
   * plain value would fail all of them under strict mode at once, so the
   * value-shaped callback is a second prop rather than a new spelling of this
   * one.
   */
  export type SelectChangeEvent = Event & { currentTarget: HTMLSelectElement };

  /** One row of the option list, in either mode. */
  export interface SelectOption {
    /** The submitted value, and the key the row is rendered under. */
    value: string;
    /** What the user reads. */
    label: string;
    /** Blocks this row alone. A disabled control blocks every row. */
    disabled?: boolean;
    /**
     * Drawn before the label. Listbox mode only: a native option element holds
     * text and nothing else, so native mode drops it rather than standing in a
     * Unicode character that would render at whatever weight the reader's font
     * gives it.
     */
    icon?: Component<{ size?: number; class?: string }>;
    /**
     * Extra text the default matcher searches, so a machine name finds a row
     * that displays under a friendlier one.
     */
    keywords?: string[];
    /**
     * Groups rows under a heading. A group is a run of neighbouring rows that
     * name it, in both modes, because optgroup nests and cannot describe an
     * interleaved list either. A caller who interleaves two groups gets the
     * heading twice, which is what the array says.
     */
    group?: string;
  }
</script>

<script lang="ts">
  /**
   * A select in four kinds: a native one, a native one driven by an array, a
   * custom listbox that can search and carry icons, and a listbox behind a
   * trigger of the caller's own.
   *
   * The native element is the default and stays the default. Most call sites
   * sit inside a form and pass `name`, and a custom listbox is a button, which
   * serializes nothing; one call site submits its form from the change event's
   * `currentTarget.form`, which only a form-associated element carries. So the
   * mode is never inferred, not from `options` and not from `searchable`: a
   * page inside a form opts in to the listbox deliberately or keeps a real
   * select.
   *
   * Listbox mode owns nothing of its own behaviour. The open state, the active
   * row, the keyboard model and the dismissal come from internal/listbox, the
   * matching from internal/filter and every class in the panel from
   * internal/panel, so this control cannot drift away from the other lists in
   * the library the way the four hand-rolled ones drifted from each other.
   */
  import type { Snippet } from 'svelte';
  import { applyFilter, type FilterInput } from '../internal/filter.js';
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';
  import { createListbox } from '../internal/listbox.svelte.js';
  import {
    PANEL_EMPTY,
    PANEL_GROUP_LABEL,
    PANEL_LIST,
    PANEL_SURFACE,
    panelOption,
  } from '../internal/panel.js';

  interface Props {
    /** The selected value. Bindable, so a listbox pick reaches the caller without a callback. */
    value?: string | null;
    id?: string;
    name?: string;
    label?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    class?: string;
    /** Native mode only. Its signature is frozen; see SelectChangeEvent. */
    onchange?: (e: SelectChangeEvent) => void;
    /** Option elements, written by hand. Native mode only. */
    children?: Snippet;
    /**
     * 'native' renders a real select. 'listbox' renders the custom panel.
     * Never inferred: see the note above.
     */
    mode?: 'native' | 'listbox';
    /** The rows, as data. Renders as option elements in native mode. */
    options?: SelectOption[];
    /** Listbox mode. Adds a search field inside the panel. */
    searchable?: boolean;
    /**
     * Replaces the default matcher, or false to switch local filtering off
     * because the list arrived already narrowed, by a server query for instance.
     */
    filter?: FilterInput<SelectOption>;
    /** Fills the trigger in listbox mode. Receives the selected row and the open state. */
    trigger?: Snippet<[{ selected: SelectOption | undefined; open: boolean }]>;
    /** Shown when nothing is selected. In native mode it renders as a leading empty row. */
    placeholder?: string;
    /** Value-shaped and additive, so the event signature above stays frozen. Fires in both modes. */
    onvaluechange?: (value: string) => void;
  }

  let {
    value = $bindable(null),
    id,
    name,
    label,
    hint,
    required = false,
    disabled = false,
    error,
    class: cls = '',
    onchange,
    children,
    mode = 'native',
    options = [],
    searchable = false,
    filter,
    trigger,
    placeholder,
    onvaluechange,
  }: Props = $props();

  /*
   * $props.id() and not Math.random(): a random id differs between the server
   * render and hydration, and both the label association and every idref the
   * listbox emits are built from this one.
   *
   * The label-derived id stays for a control that has a label, because call
   * sites point their own markup at it. The fallback used to be undefined,
   * which left an error message with no id and the control with no
   * aria-describedby, so an unlabelled field announced its value and never the
   * reason it was rejected.
   */
  const uid = $props.id();
  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : uid));

  const listboxMode = $derived(mode === 'listbox');

  let query = $state('');
  let triggerEl = $state<HTMLButtonElement | undefined>();
  let searchEl = $state<HTMLInputElement | undefined>();

  /** The rows the panel is showing. Native mode never filters, so it never narrows. */
  const rows = $derived(listboxMode ? applyFilter(options, query, filter) : options);
  const selected = $derived(options.find((option) => option.value === value));

  interface Row {
    option: SelectOption;
    /** Position in `rows`, which is what the listbox indexes by. */
    index: number;
  }

  interface Block {
    group: string | undefined;
    rows: Row[];
  }

  /**
   * Splits the list into runs of rows that share a group.
   *
   * Runs rather than a bucket per name, so both modes group identically: an
   * optgroup nests, so a native select cannot show one group in two places
   * either, and a caller whose array interleaves gets the same answer from both.
   */
  function groupRuns(list: readonly SelectOption[]): Block[] {
    const blocks: Block[] = [];
    list.forEach((option, index) => {
      const open = blocks[blocks.length - 1];
      if (open !== undefined && open.group === option.group) open.rows.push({ option, index });
      else blocks.push({ group: option.group, rows: [{ option, index }] });
    });
    return blocks;
  }

  const blocks = $derived(groupRuns(rows));

  const box = createListbox<SelectOption>({
    items: () => rows,
    baseId: () => uid,
    onSelect: (option) => choose(option),
    // A search box makes letters query text, so the two typeaheads cannot both
    // own them.
    typeahead: () => !searchable,
    // Left off, so the ends of the list are where a native select puts them.
    onClose: () => {
      query = '';
    },
  });

  const anchor = box.anchor;
  const panel = box.panel;

  function choose(option: SelectOption): void {
    if (option.disabled === true) return;
    value = option.value;
    onvaluechange?.(option.value);
    // The factory leaves the list open, because a multi-value control collects
    // several picks in one pass. This one takes a single value.
    box.close('select');
    // The row that was clicked is about to be unmounted, so focus has somewhere
    // to be returned to or it falls to the body.
    triggerEl?.focus();
  }

  function nativeChange(event: SelectChangeEvent): void {
    value = event.currentTarget.value;
    // Called synchronously and with the event untouched, so currentTarget is
    // still the select and a call site can submit the form from it.
    onchange?.(event);
    onvaluechange?.(event.currentTarget.value);
  }

  function search(event: Event & { currentTarget: HTMLInputElement }): void {
    query = event.currentTarget.value;
    // The keyboard must not rest on a row the new query pushed out from under
    // it: aria-activedescendant would name a different option than the one the
    // ring is drawn on.
    box.setActive(rows.findIndex((option) => option.disabled !== true));
  }

  $effect(() => {
    if (box.open && searchEl !== undefined) searchEl.focus();
  });

  let warned = false;

  /*
   * A listbox-only prop passed to a native select is a caller mistake with
   * three possible answers, and only one of them is safe.
   *
   * Throwing turns a cosmetic slip into a blank page in a form the user was
   * halfway through. Upgrading the mode is worse than it looks: it swaps a
   * form-associated element for a button, so the change event stops firing and
   * the call sites that submit their form from it go quiet with no error
   * anywhere. Warning leaves the page working as the native select it asked
   * for and puts the mistake where the developer will read it. Once per
   * instance, and from an effect, so a server render does not repeat it into
   * the log on every request.
   */
  $effect(() => {
    if (listboxMode || warned) return;
    const ignored = [searchable ? 'searchable' : '', trigger ? 'trigger' : ''].filter(
      (part) => part !== '',
    );
    if (ignored.length === 0) return;
    warned = true;
    for (const prop of ignored) {
      console.warn(`Select: the ${prop} prop applies to mode="listbox" and was ignored.`);
    }
  });
</script>

{#snippet chevron(open: boolean)}
  <span
    class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint"
    aria-hidden="true"
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      class="transition-transform duration-150 {open ? 'rotate-180' : ''}"
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
{/snippet}

{#snippet optionRow(row: Row)}
  {@const option = row.option}
  {@const isSelected = option.value === value}
  <!--
    role is stated as well as spread. The compiler checks aria-selected against
    the role it can see in the source, and it cannot see into a spread, so
    without this the row reads to it as a plain button carrying an attribute
    buttons do not take. The spread sets the same value.
  -->
  <button
    type="button"
    role="option"
    onclick={() => choose(option)}
    onmouseenter={() => box.setActive(row.index)}
    aria-selected={isSelected ? 'true' : 'false'}
    {...box.optionAttrs(row.index)}
    class={panelOption({
      active: box.activeIndex === row.index,
      selected: isSelected,
      disabled: option.disabled === true,
    })}
  >
    {#if option.icon}
      {@const Icon = option.icon}
      <Icon size={16} class="shrink-0" />
    {/if}
    <span class="min-w-0 truncate">{option.label}</span>
    {#if isSelected}
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        class="ml-auto shrink-0"
        aria-hidden="true"
      >
        <path
          d="M2 6.5l2.5 2.5L10 3"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </button>
{/snippet}

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
    </label>
  {/if}

  {#if listboxMode}
    <div class="relative" use:anchor>
      <!--
        The trigger is a button, so the snippet fills it rather than replacing
        it: a caller-supplied element would have to carry the id, the label
        association and four aria attributes itself, and a button nested inside
        another button is not valid markup a browser will focus.
      -->
      <!--
        role="combobox" is the select-only combobox pattern, and it is also
        what carries aria-invalid and aria-required: a bare button takes
        neither, so the control could not report its own validity. The role and
        the expanded state are stated here as well as spread, because the
        compiler checks both against the source it can read and it cannot read
        a spread. The spread sets the same expanded value.
      -->
      <button
        bind:this={triggerEl}
        type="button"
        role="combobox"
        aria-expanded={box.open}
        id={fieldId}
        {disabled}
        onclick={() => box.toggle()}
        onkeydown={(event) => {
          box.onkeydown(event);
        }}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...box.triggerAttrs}
        class="{CONTROL_BASE} {controlBorder(!!error)} flex cursor-pointer items-center gap-2 pr-8
          text-left"
      >
        {#if trigger}
          {@render trigger({ selected, open: box.open })}
        {:else if selected}
          {#if selected.icon}
            {@const Icon = selected.icon}
            <Icon size={16} class="shrink-0" />
          {/if}
          <span class="min-w-0 truncate">{selected.label}</span>
        {:else}
          <span class="min-w-0 truncate text-faint">{placeholder ?? ''}</span>
        {/if}
      </button>
      {@render chevron(box.open)}

      <!--
        The value the form actually submits. The visible control is a button,
        which serializes nothing, and a hidden input is barred from constraint
        validation, so `required` is announced through aria-required and
        enforced by the caller rather than by the browser.
      -->
      <input type="hidden" {name} {disabled} value={value ?? ''} />

      {#if box.open}
        <div class="{PANEL_SURFACE} w-full">
          {#if searchable}
            <div class="border-b border-line p-2">
              <!--
                The second combobox over the same list, and it earns the role:
                the trigger has to announce collapsed while it is closed, and
                this box has to announce the active row while it holds focus.
                It is rendered only while the panel is open, so its expanded
                state is a constant.
              -->
              <input
                bind:this={searchEl}
                type="text"
                role="combobox"
                aria-expanded="true"
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

          <div class={PANEL_LIST} use:panel {...box.listAttrs}>
            {#each blocks as block, position (position)}
              {#if block.group !== undefined}
                <!-- Named once, on the group. The heading repeats it on screen. -->
                <div role="group" aria-label={block.group}>
                  <div class={PANEL_GROUP_LABEL} aria-hidden="true">{block.group}</div>
                  {#each block.rows as row (row.option.value)}
                    {@render optionRow(row)}
                  {/each}
                </div>
              {:else}
                {#each block.rows as row (row.option.value)}
                  {@render optionRow(row)}
                {/each}
              {/if}
            {/each}

            {#if rows.length === 0}
              <p class={PANEL_EMPTY}>No matches</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="relative">
      <select
        id={fieldId}
        {name}
        {required}
        {disabled}
        value={value ?? ''}
        onchange={nativeChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        class="{CONTROL_BASE} {controlBorder(!!error)} cursor-pointer appearance-none pr-8"
      >
        {#if children}
          {@render children()}
        {:else}
          {#if placeholder}
            <option value="">{placeholder}</option>
          {/if}
          {#each blocks as block, position (position)}
            {#if block.group !== undefined}
              <optgroup label={block.group}>
                {#each block.rows as row (row.option.value)}
                  <option value={row.option.value} disabled={row.option.disabled}>
                    {row.option.label}
                  </option>
                {/each}
              </optgroup>
            {:else}
              {#each block.rows as row (row.option.value)}
                <option value={row.option.value} disabled={row.option.disabled}>
                  {row.option.label}
                </option>
              {/each}
            {/if}
          {/each}
        {/if}
      </select>
      {@render chevron(false)}
    </div>
  {/if}

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
