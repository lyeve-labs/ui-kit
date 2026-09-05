<script lang="ts">
  /**
   * A grouping inside a page: a heading, an optional description and a body,
   * on a lighter surface than Card.
   *
   * An audit counted 63 hand-rolled card surfaces across 31 files in nine
   * paddings while Card itself was used zero times. Many of them did not want
   * a Card. They wanted a labelled group inside a page, and reaching for a
   * card meant a box on a box, so each one was written out by hand and each
   * one picked its own padding. Panel is that group: it takes Card's surface
   * and Card's padding scale from the shared layout contract, so a panel and a
   * card sitting on the same page agree, and it adds a `plain` variant for the
   * groups that wanted the heading and the rhythm without the box at all.
   *
   * The heading is a real h2 or h3. A page's outline is what a screen reader
   * navigates by, and a styled div appears in no heading list.
   */
  import type { Component, Snippet } from 'svelte';
  import { CARD_PAD, CARD_SURFACE, sectionHeading } from '../internal/layout.js';

  type Pad = 'none' | 'sm' | 'md';
  type Variant = 'bordered' | 'plain';

  interface Props {
    heading?: string;
    /** 2 directly under a page title, 3 inside a card or another panel. */
    headingLevel?: 2 | 3;
    description?: string;
    /** Drawn before the heading. */
    icon?: Component<{ size?: number; class?: string }>;
    pad?: Pad;
    /** A quiet variant with no border, for a grouping that needs separation but not a box. */
    variant?: Variant;
    class?: string;
    actions?: Snippet;
    children: Snippet;
  }

  let {
    heading = undefined,
    headingLevel = 3,
    description = undefined,
    icon = undefined,
    pad = 'md',
    variant = 'bordered',
    class: klass = '',
    actions,
    children,
  }: Props = $props();

  /**
   * `plain` states nothing at all rather than turning the border off.
   *
   * A `border-0` after `border border-line` is two utilities for one property,
   * and which of them wins is decided by the order Tailwind emits them and not
   * by the order they were written here.
   */
  const SURFACE: Record<Variant, string> = {
    bordered: CARD_SURFACE,
    plain: '',
  };

  /**
   * Padding and variant stay independent, so `plain` is not silently also a
   * padding change. A plain panel usually takes `pad="none"`: with no box to
   * inset from, an inset only pushes its heading out of line with the page.
   */
  const surface = $derived(`${SURFACE[variant]} ${CARD_PAD[pad]}`.trim());
</script>

<div class="flex flex-col gap-stack {surface} {klass}">
  {#snippet headingText()}
    {#if icon}
      {@const Icon = icon}
      <span class="shrink-0 text-muted" aria-hidden="true"><Icon size={16} /></span>
    {/if}
    {heading}
  {/snippet}

  {#if heading || description || actions}
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1">
        <!-- Two branches rather than one dynamic element: the level is a
             document structure decision, and both headings this can produce
             should be readable in the file. -->
        {#if heading && headingLevel === 2}
          <h2 class="{sectionHeading(2)} flex items-center gap-2">{@render headingText()}</h2>
        {:else if heading}
          <h3 class="{sectionHeading(3)} flex items-center gap-2">{@render headingText()}</h3>
        {/if}
        {#if description}<p class="text-sm text-muted">{description}</p>{/if}
      </div>

      {#if actions}
        <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
      {/if}
    </div>
  {/if}

  <div>{@render children()}</div>
</div>
