<script lang="ts" module>
  import type { Component } from 'svelte';

  /** One segment of the row. */
  export interface SegmentOption<T extends string = string> {
    /** The chosen value, and the key the segment is rendered under. */
    value: T;
    /** Names this one segment. The group is named by `label`. */
    label: string;
    /** A lucide component. The control sizes it, so the caller does not guess. */
    icon?: Component<{ size?: number; class?: string }>;
    /**
     * Renders the segment as a link to this URL instead of a radio. Every
     * option carries one or none does; the modes cannot be mixed in one
     * control. The chosen segment is still the one whose value matches
     * `value`, and it carries aria-current="page", so a page can keep its
     * choice in the URL and the control works before any script has loaded.
     */
    href?: string;
  }
</script>

<script lang="ts" generics="T extends string">
  import { FIELD_LABEL, FIELD_WRAP } from '../internal/field.js';
  import { safeHref } from '../internal/href.js';

  type Size = 'sm' | 'md';

  interface Props {
    /** The chosen value. One of the option values. */
    value: T;
    options: SegmentOption<T>[];
    /**
     * The group's accessible name. Required because an unnamed group announces
     * as a bare set of controls, which leaves a reader to work out what the set
     * is for from the segments alone.
     */
    label: string;
    /** Drops the caption above the row. The group keeps its accessible name. */
    labelHidden?: boolean;
    /** Submits the value with the surrounding form, through a hidden input. */
    name?: string;
    size?: Size;
    disabled?: boolean;
    class?: string;
    /** Value mode only. A link segment reports nothing; the page it opens does. */
    onchange?: (value: T) => void;
  }

  let {
    value = $bindable(),
    options,
    label,
    labelHidden = false,
    name = undefined,
    size = 'md',
    disabled = false,
    class: klass = '',
    onchange = undefined,
  }: Props = $props();

  /**
   * The row height comes from the control token, so a segmented control and an
   * Input in the same row line up. The segments stretch inside it rather than
   * setting their own height, which would add the row's padding and border on
   * top and stand the control two pixels proud of everything beside it.
   */
  const SIZES: Record<Size, { row: string; segment: string; icon: number }> = {
    sm: { row: 'h-8', segment: 'gap-1.5 px-2.5 text-xs', icon: 14 },
    md: { row: 'h-control', segment: 'gap-2 px-3 text-sm', icon: 16 },
  };

  let rootEl: HTMLDivElement | undefined = $state();

  /*
   * Link mode when every option carries an href. A row that mixes the two is
   * refused outright rather than rendered as best it can: a radio beside two
   * links would report a choice that the URL never learns about, and the
   * caller has no way to see that from the screen.
   */
  const linked = $derived.by(() => {
    const count = options.filter((o) => o.href !== undefined).length;
    if (count !== 0 && count !== options.length) {
      throw new Error(
        `SegmentedControl: every option carries href or none does, ${count} of ${options.length} did`,
      );
    }
    return count !== 0;
  });

  const selectedIndex = $derived(options.findIndex((o) => o.value === value));

  /*
   * In link mode the arrows move focus without moving the choice, since the
   * choice is the URL and only following a link changes it. The tab stop
   * travels with focus while it is inside the group, and returns to the chosen
   * segment when focus leaves, so Tab re-enters on the one that is current.
   */
  let roving: number | null = $state(null);

  /*
   * The group holds ONE tab stop, which is the whole reason this is not a row
   * of buttons: a picker of five themes cost five presses of Tab to step over.
   *
   * A value matching no option would leave every segment at tabindex -1 and
   * drop the control out of the tab order entirely, so the first segment holds
   * the stop until something is chosen.
   */
  const tabStop = $derived(roving ?? (selectedIndex === -1 ? 0 : selectedIndex));

  function segmentAt(index: number): HTMLElement | undefined {
    return rootEl?.querySelectorAll<HTMLElement>('[data-segment]')[index];
  }

  function onGroupFocusOut(e: FocusEvent) {
    if (rootEl && e.relatedTarget instanceof Node && rootEl.contains(e.relatedTarget)) return;
    roving = null;
  }

  function choose(index: number) {
    // Disabled is enforced here as well as on each button. The native attribute
    // is what stops a real press, and it is the only thing that does, so a
    // change arriving any other way would still move the bound value with
    // nothing on screen to say so.
    if (disabled) return;
    const next = options[index];
    if (!next) return;
    if (next.value !== value) {
      value = next.value;
      onchange?.(next.value);
    }
    // The roving stop follows the pointer too. A press does not focus a button
    // in every browser, so without this a later Tab re-enters the group on
    // whichever segment the keyboard last left.
    segmentAt(index)?.focus();
  }

  /**
   * The radio keyboard pattern: the arrows move the selection and wrap, Home
   * and End go to the ends, and focus travels with the choice.
   */
  function onSegmentKeydown(e: KeyboardEvent, index: number) {
    const last = options.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    // The arrows scroll the page, and Home and End jump it to the ends.
    e.preventDefault();
    if (linked) {
      if (disabled) return;
      roving = next;
      segmentAt(next)?.focus();
    } else {
      choose(next);
    }
  }
</script>

<div class="{FIELD_WRAP} items-start {klass}">
  {#if !labelHidden}
    <!-- A caption, not a label element. The group is named by aria-label, and a
         label has nothing to point at here: role="radiogroup" is not a form
         control that `for` can name. -->
    <span class={FIELD_LABEL}>{label}</span>
  {/if}

  <!-- A set of links is a group, not a radiogroup: a link is not a radio and
       carries no aria-checked, and what marks the current one is aria-current,
       the attribute a reader already knows from navigation. -->
  <div
    bind:this={rootEl}
    role={linked ? 'group' : 'radiogroup'}
    aria-label={label}
    onfocusout={linked ? onGroupFocusOut : undefined}
    class="inline-flex items-stretch rounded-lg border border-line-strong bg-surface-2 p-0.5 {SIZES[
      size
    ].row} {disabled ? 'opacity-50' : ''}"
  >
    {#each options as option, i (option.value)}
      {@const selected = option.value === value}
      {@const Icon = option.icon}
      {@const segment =
        'inline-flex items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:cursor-not-allowed ' +
        SIZES[size].segment +
        (selected
          ? ' bg-surface text-fg shadow-sm'
          : ' text-muted hover:text-fg active:bg-surface active:text-fg')}
      {#snippet content()}
        {#if Icon}
          <Icon size={SIZES[size].icon} class="shrink-0" />
        {/if}
        <span class="grid text-center">
          <!-- The bold copy holds the width of the heaviest state in every
               segment. Weight alone would resize the segment the selection
               lands on, and the whole row would shuffle under the pointer as
               the user moved along it. -->
          <span class="invisible col-start-1 row-start-1 font-semibold" aria-hidden="true"
            >{option.label}</span
          >
          <span class="col-start-1 row-start-1 {selected ? 'font-semibold' : 'font-normal'}"
            >{option.label}</span
          >
        </span>
      {/snippet}
      {#if linked}
        <!--
          A plain anchor with no click handler, so the choice is a navigation
          the browser performs on its own. A disabled row drops the hrefs: an
          anchor with no href is not a link, and aria-disabled says why.
        -->
        <a
          data-segment
          href={disabled ? undefined : safeHref(option.href)}
          aria-current={selected ? 'page' : undefined}
          aria-disabled={disabled ? 'true' : undefined}
          tabindex={disabled ? -1 : i === tabStop ? 0 : -1}
          onkeydown={(e) => onSegmentKeydown(e, i)}
          class="{segment} {disabled ? 'cursor-not-allowed' : ''}"
        >
          {@render content()}
        </a>
      {:else}
        <!--
          Each segment is a radio, and aria-checked is what a screen reader
          reads. The theme picker this replaces was a row of plain buttons whose
          choice was carried by a background colour alone, so a screen reader
          user was told nothing and a colour-blind user saw nothing. The
          selected segment also sits at a heavier weight, so the state survives
          a palette a reader cannot separate.
        -->
        <button
          data-segment
          type="button"
          role="radio"
          aria-checked={selected}
          tabindex={i === tabStop ? 0 : -1}
          {disabled}
          onclick={() => choose(i)}
          onkeydown={(e) => onSegmentKeydown(e, i)}
          class={segment}
        >
          {@render content()}
        </button>
      {/if}
    {/each}
  </div>

  {#if name}
    <!-- A div with role="radiogroup" submits nothing. The value reaches a form
         post through this and not through the segments, which are buttons and
         would each post their own. -->
    <input type="hidden" {name} {value} />
  {/if}
</div>
