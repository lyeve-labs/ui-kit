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
     * option carries one or none does. The modes cannot be mixed in one
     * control. The chosen segment is still the one whose value matches
     * `value`, and it carries aria-current="page", so a page can keep its
     * choice in the URL and the control works before any script has loaded.
     */
    href?: string;
  }
</script>

<script lang="ts" generics="T extends string">
  import FieldMessage from '../internal/FieldMessage.svelte';
  import AssistActions from '../internal/AssistActions.svelte';
  import AssistRow from '../internal/AssistRow.svelte';
  import { assistField } from '../internal/assist.svelte.js';
  import {
    ASSIST_TAG,
    ASSIST_WRAP,
    FIELD_LABEL,
    FIELD_WRAP,
    describedBy,
    joinIds,
  } from '../internal/field.js';
  import { assertLinked, safeHref } from '../internal/href.js';
  import type { IconPx } from '../internal/icon.js';
  import { HIT_AREA } from '../internal/touch.js';

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
    /**
     * Drops the caption above the row. The group keeps its accessible name.
     * Pass it with `labeledBy`, or the row draws its own caption as well as
     * the one it is named by.
     */
    labelHidden?: boolean;
    /**
     * The group's id. The hint and the error take theirs from it. Left unset,
     * the group carries no id and the messages take a generated one.
     */
    id?: string;
    /** Shown under the row while there is no error. */
    hint?: string;
    /**
     * Replaces the hint while it is set. A row of radios is marked invalid
     * with it. A row of links is not, because ARIA refuses the attribute there.
     */
    error?: string;
    /**
     * Ids of other elements that describe the group, separated by spaces, such
     * as the message a wrapping Field renders. They are read after the group's
     * own hint or error.
     */
    describedBy?: string;
    /**
     * The id of a caption drawn outside the row, a `Field` one for instance.
     * The group takes its name from it in place of `label`. The row still draws
     * `label` above itself until `labelHidden` is set too.
     */
    labeledBy?: string;
    /** Submits the value with the surrounding form, through a hidden input. */
    name?: string;
    size?: Size;
    disabled?: boolean;
    class?: string;
    /** Value mode only. A link segment reports nothing. The page it opens does. */
    onchange?: (value: T) => void;
    /**
     * Keeps the value from an assistant: a FormAssist never reports it and
     * never fills it. Also marks the control `data-no-ai` for a browser agent.
     */
    noAI?: boolean;
  }

  let {
    value = $bindable(),
    options,
    label,
    labelHidden = false,
    id = undefined,
    hint = undefined,
    error = undefined,
    describedBy: callerIds = undefined,
    labeledBy = undefined,
    name = undefined,
    size = 'md',
    disabled = false,
    class: klass = '',
    onchange = undefined,
    noAI = false,
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
    kind: 'choice',
    get noAI() {
      return noAI;
    },
    get options() {
      return options.map((option) => ({ value: option.value, label: option.label }));
    },
    get value() {
      return value ?? null;
    },
    set value(v) {
      value = v as T;
    },
  });

  /**
   * The row height comes from the control token, so a segmented control and an
   * Input in the same row line up. The segments stretch inside it rather than
   * setting their own height, which would add the row's padding and border on
   * top and stand the control two pixels proud of everything beside it.
   *
   * Under a finger the small row grows to the control height, as a small
   * Button does, and each segment keeps its visual inside the track and takes
   * a hit box of the control size. A segment that grew instead would stand
   * the track six pixels proud of the Input beside it.
   *
   * A segment is never narrower than the control size under a finger, so a
   * short label such as "6h" takes a 44px target across as well, and the hit
   * boxes of two neighbors do not overlap.
   */
  const SIZES: Record<Size, { row: string; segment: string; stack: string; icon: IconPx }> = {
    sm: {
      row: 'h-8 coarse:min-h-control',
      segment: 'gap-1.5 px-2.5 text-xs',
      stack: 'min-h-6.5 coarse:min-h-control',
      icon: 14,
    },
    md: {
      row: 'h-control',
      segment: 'gap-2 px-3 text-sm',
      stack: 'min-h-8 coarse:min-h-control',
      icon: 16,
    },
  };

  /*
   * $props.id() and not Math.random(), so the message ids match between the
   * server render and hydration. The group carries an id only when the caller
   * names one, so a control given none keeps the attributes it had.
   */
  const uid = $props.id();
  const messageBase = $derived(id ?? uid);
  const describedByIds = $derived(joinIds(describedBy(messageBase, error, hint), callerIds));

  let rootEl: HTMLDivElement | undefined = $state();

  /*
   * A label never breaks inside its segment. In a side panel narrower than
   * the row, "Read and write" broke into two lines in every segment and the
   * row read as a block of fragments. A row wider than its container stacks
   * its options instead, each segment the container's width, and lies back
   * down once the container holds the width the row was measured at. A
   * stacked segment is as tall as a segment in the row.
   *
   * The width is read from the row while it lies flat, since a stack is as
   * wide as its container and says nothing about the labels. New labels are
   * read flat again. A container with no width yet, inside a closed panel,
   * is read when it opens.
   *
   * The field may shrink below its row (min-w-0), and a stack keeps the row's
   * width as its own, capped by the field. A flex row or a grid column sizes
   * the field by what it holds: without the first it never shrank, so a row
   * that did not fit ran past its container, and without the second a stack
   * offered only its widest label and never lay back down. Set from script,
   * since a page's policy may refuse a style attribute.
   */
  let stacked = $state(false);
  let natural = 0;
  const labels = $derived(JSON.stringify(options.map((o) => o.label)));

  function fit() {
    const room = rootEl?.parentElement?.clientWidth ?? 0;
    if (rootEl === undefined || room === 0) return;
    if (!stacked) {
      natural = rootEl.offsetWidth;
      if (natural > room) stacked = true;
    } else if (natural <= room) {
      stacked = false;
    }
    rootEl.style.width = stacked ? `${natural}px` : '';
  }

  $effect(() => {
    const wrap = rootEl?.parentElement;
    void labels;
    if (rootEl === undefined || !wrap || typeof ResizeObserver === 'undefined') return;
    stacked = false;
    rootEl.style.width = '';
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    observer.observe(rootEl);
    return () => observer.disconnect();
  });

  /*
   * Link mode when every option carries an href. A row that mixes the two is
   * refused outright rather than rendered as best it can: a radio beside two
   * links would report a choice that the URL never learns about, and the
   * caller has no way to see that from the screen.
   */
  const linked = $derived(assertLinked(options, 'SegmentedControl'));

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

<div
  data-field
  data-no-ai={noAI ? '' : undefined}
  class="{FIELD_WRAP} min-w-0 items-start {klass}{assist.pending ? ASSIST_WRAP : ''}"
>
  {#if !labelHidden}
    <!-- A caption, not a label element. The group is named by aria-label, or
         by the caption it is handed, and a label has nothing to point at
         here: role="radiogroup" is not a form control that `for` can name. -->
    <AssistRow field={assist}>
      <span class={FIELD_LABEL}
        >{label}{#if assist.pending}<span class={ASSIST_TAG} aria-hidden="true">Suggested</span
          >{/if}</span
      >
    </AssistRow>
  {:else if assist.pending}
    <AssistActions field={assist} />
  {/if}

  <!-- A set of links is a group, not a radiogroup: a link is not a radio and
       carries no aria-checked, and what marks the current one is aria-current,
       the attribute a reader already knows from navigation. ARIA allows
       aria-invalid on a radiogroup and not on a group, so a row of links
       reports an error through aria-describedby alone.

       Under a finger the track draws its frame as an inset outline with no
       border, and its padding grows by the border's pixel. A caller that
       lets a long row scroll clips the segments at the track's padding box,
       which a border keeps 2px short of the outer edge, so each segment's
       44px hit box lost a pixel at the top and the bottom. The track's own
       overflow does not clip its outline, and forced colors keep an outline
       where they drop a shadow. The drawn frame and the segments stay where
       they were. -->
  <div
    bind:this={rootEl}
    {id}
    role={linked ? 'group' : 'radiogroup'}
    aria-label={labeledBy ? undefined : label}
    aria-labelledby={labeledBy}
    aria-invalid={error && !linked ? 'true' : undefined}
    aria-describedby={describedByIds}
    onfocusout={linked ? onGroupFocusOut : undefined}
    class="{stacked
      ? 'flex max-w-full flex-col'
      : 'inline-flex'} items-stretch rounded-lg border {error
      ? 'border-danger coarse:outline-danger'
      : 'border-line-strong coarse:outline-line-strong'} bg-surface-2 inset-shadow-well p-0.5 coarse:border-0 coarse:p-0.75 coarse:outline coarse:outline-1 coarse:-outline-offset-1 {stacked
      ? ''
      : SIZES[size].row} {disabled ? 'opacity-50' : ''}"
  >
    {#each options as option, i (option.value)}
      {@const selected = option.value === value}
      {@const Icon = option.icon}
      {@const segment =
        `${HIT_AREA} inline-flex coarse:min-w-control items-center justify-center whitespace-nowrap rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus disabled:cursor-not-allowed ` +
        SIZES[size].segment +
        (stacked ? ` ${SIZES[size].stack}` : '') +
        (selected
          ? ' bg-surface text-brand shadow-raised inset-shadow-highlight ring-1 ring-inset ring-brand/40'
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
          choice was carried by a background color alone, so a screen reader
          user was told nothing and a color-blind user saw nothing. The
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

  <FieldMessage base={messageBase} {error} {hint} />

  {#if name}
    <!-- A div with role="radiogroup" submits nothing. The value reaches a form
         post through this and not through the segments, which are buttons and
         would each post their own. -->
    <input type="hidden" {name} {value} />
  {/if}
</div>
