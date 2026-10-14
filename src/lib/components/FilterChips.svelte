<script lang="ts" module>
  import type { Component } from 'svelte';

  /** One chip. */
  export interface FilterChip<T extends string = string> {
    /** The chosen value, and the key the chip is rendered under. */
    value: T;
    /** What the reader sees. */
    label: string;
    /** How many rows this chip leaves on screen, drawn small beside the label. */
    count?: number;
    /** A lucide component before the label. */
    icon?: Component<{ size?: number; class?: string }>;
    /**
     * Renders the chip as a link to this URL instead of a button. Every chip
     * carries one or none does. The modes cannot be mixed in one row. The
     * current chip is still the one whose value matches `value`, and it
     * carries aria-current="page", so a page can keep its filter in the URL
     * and the row works before any script has loaded.
     */
    href?: string;
  }
</script>

<script lang="ts" generics="T extends string">
  /**
   * One filter out of many: a row of chips that wraps.
   *
   * A SegmentedControl holds two to four short options in one strip. A
   * catalog filtered by a dozen categories does not fit one: the strip either
   * scrolls, hiding categories past the edge, or squeezes each label onto two
   * lines inside its segment. Chips wrap instead, so every category is in
   * sight at every width. One is always pressed.
   *
   * With an href on every chip the row is a set of links instead, for a
   * filter the page keeps in its URL.
   */
  import { cn } from '../utils/cn.js';
  import { FIELD_ERROR, FIELD_HINT, describedBy, joinIds } from '../internal/field.js';
  import { safeHref } from '../internal/href.js';
  import { HIT_AREA } from '../internal/touch.js';

  interface Props {
    /** The pressed chip's value. In link mode, the value of the current chip. */
    value: T;
    options: FilterChip<T>[];
    /** Names the group for assistive technology. The chips name themselves. */
    label: string;
    /** Read after the count, so "3" is heard as "3 on sale". */
    countLabel?: string;
    /**
     * The group's id. The hint and the error take theirs from it. Left unset,
     * the group carries no id and the messages take a generated one.
     */
    id?: string;
    /** Shown under the row while there is no error. */
    hint?: string;
    /**
     * Replaces the hint while it is set. The group points at it and is not
     * marked invalid, because ARIA refuses that attribute on a group.
     */
    error?: string;
    /**
     * Ids of other elements that describe the group, separated by spaces, such
     * as the message a wrapping Field renders. They are read after the group's
     * own hint or error.
     */
    describedBy?: string;
    class?: string;
    /** Button mode only. A link chip reports nothing. The page it opens does. */
    onchange?: (value: T) => void;
  }

  let {
    value = $bindable(),
    options,
    label,
    countLabel = '',
    id = undefined,
    hint = undefined,
    error = undefined,
    describedBy: callerIds = undefined,
    class: klass = '',
    onchange = undefined,
  }: Props = $props();

  /*
   * Link mode when every chip carries an href. A row that mixes the two is
   * refused outright, for the reason SegmentedControl refuses one: a button
   * beside two links would report a choice that the URL never learns about,
   * and the caller has no way to see that from the screen.
   */
  const linked = $derived.by(() => {
    const count = options.filter((o) => o.href !== undefined).length;
    if (count !== 0 && count !== options.length) {
      throw new Error(
        `FilterChips: every option carries href or none does, ${count} of ${options.length} did`,
      );
    }
    return count !== 0;
  });

  /*
   * $props.id() and not Math.random(), so the message ids match between the
   * server render and hydration. The group carries an id only when the caller
   * names one, so a row given none keeps the attributes it had.
   */
  const uid = $props.id();
  const messageBase = $derived(id ?? uid);
  const describedByIds = $derived(joinIds(describedBy(messageBase, error, hint), callerIds));

  function pick(next: T): void {
    if (next === value) return;
    value = next;
    onchange?.(next);
  }

  /** One treatment for both modes, so a current link reads as a pressed chip. */
  function chipClass(pressed: boolean): string {
    return cn(
      HIT_AREA,
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      pressed
        ? 'border-brand bg-brand/10 text-fg'
        : 'border-line text-muted hover:border-line-strong hover:text-fg',
    );
  }
</script>

<!--
  The row is rendered once and the message follows it as a sibling. A column
  wrapped round the two only while a message showed rebuilt the row each time
  an error arrived or cleared, and a chip that held focus dropped it to the
  page. The row carries the field marker while it reports a message, so a
  panel sizing itself to its form counts it as the one field it then is.

  The row carries no aria-invalid. ARIA does not allow it on a group, or on
  the buttons and links inside one, so an error reaches a reader through
  aria-describedby, which reads the message itself.
-->
<div
  data-field={error || hint ? '' : undefined}
  {id}
  class={cn('flex flex-wrap gap-1.5', klass)}
  role="group"
  aria-label={label}
  aria-describedby={describedByIds}
>
  {#each options as chip (chip.value)}
    {@const pressed = chip.value === value}
    {#if linked}
      <!-- A plain anchor with no click handler, so choosing a chip is a
           navigation the browser performs on its own, before the page has
           hydrated as well as after. -->
      <a
        href={safeHref(chip.href)}
        aria-current={pressed ? 'page' : undefined}
        class={chipClass(pressed)}
      >
        {@render face(chip)}
      </a>
    {:else}
      <button
        type="button"
        aria-pressed={pressed}
        class={chipClass(pressed)}
        onclick={() => pick(chip.value)}
      >
        {@render face(chip)}
      </button>
    {/if}
  {/each}
</div>
{#if error}
  <p id="{messageBase}-error" class="{FIELD_ERROR} mt-1.5">{error}</p>
{:else if hint}
  <p id="{messageBase}-hint" class="{FIELD_HINT} mt-1.5">{hint}</p>
{/if}

{#snippet face(chip: FilterChip<T>)}
  {#if chip.icon}
    {@const Icon = chip.icon}
    <Icon size={12} class="shrink-0" />
  {/if}
  {chip.label}
  {#if chip.count !== undefined}
    <span class="font-mono text-[10px] text-faint"
      >{chip.count}{#if countLabel}<span class="sr-only"> {countLabel}</span>{/if}</span
    >
  {/if}
{/snippet}
