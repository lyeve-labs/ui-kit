<script lang="ts">
  /**
   * A grouping inside a page: a heading, an optional description and a body,
   * on a lighter surface than Card.
   *
   * An audit counted 63 hand-rolled card surfaces across 31 files in nine
   * paddings while Card itself was used zero times. Many of them did not want
   * a Card. They wanted a labeled group inside a page, and reaching for a
   * card meant a box on a box, so each one was written out by hand and each
   * one picked its own padding. Panel is that group: it takes Card's surface
   * and Card's padding scale from the shared layout contract, so a panel and a
   * card sitting on the same page agree, and it adds a `plain` variant for the
   * groups that wanted the heading and the rhythm without the box at all.
   *
   * The heading is a real h2 or h3. A page's outline is what a screen reader
   * navigates by, and a styled div appears in no heading list.
   *
   * `tone="danger"` is the surface for destructive actions such as deleting an
   * account. Alert and Banner are live regions, so a form inside one is read
   * out on every change, and apps drew this box by hand instead. The tone
   * colors the heading and its icon, and the box when there is one. With
   * `variant="plain"` there is no box, so only the heading carries the tone:
   * the variant decides whether a box is drawn and the tone decides its color,
   * and neither prop silently undoes the other. That plain form is the danger
   * group inside a card that already draws the box. The description stays
   * muted, and the contrast suite measures every text token on the surface.
   */
  import type { Component, Snippet } from 'svelte';
  import {
    CARD_PAD,
    CARD_SURFACE,
    PANEL_DANGER_SURFACE,
    sectionHeading,
  } from '../internal/layout.js';

  type Pad = 'none' | 'sm' | 'md';
  type Variant = 'bordered' | 'plain';
  type Tone = 'neutral' | 'danger';

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
    /** `danger` for a group of destructive actions. It composes with `plain`, see above. */
    tone?: Tone;
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
    tone = 'neutral',
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
  const SURFACE: Record<Tone, Record<Variant, string>> = {
    neutral: { bordered: CARD_SURFACE, plain: '' },
    danger: { bordered: PANEL_DANGER_SURFACE, plain: '' },
  };

  /**
   * Padding and variant stay independent, so `plain` is not silently also a
   * padding change. A plain panel usually takes `pad="none"`: with no box to
   * inset from, an inset only pushes its heading out of line with the page.
   */
  const surface = $derived(`${SURFACE[tone][variant]} ${CARD_PAD[pad]}`.trim());

  /**
   * The level's treatment with its one text color swapped, not a second color
   * added after it: two utilities for one property resolve by emit order.
   */
  const headingClass = (level: 2 | 3) =>
    tone === 'danger'
      ? sectionHeading(level).replace(/\btext-fg\b/, 'text-danger')
      : sectionHeading(level);
</script>

<div data-print="keep" class="flex flex-col gap-stack {surface} {klass}">
  {#snippet headingText()}
    {#if icon}
      {@const Icon = icon}
      <span class="shrink-0 {tone === 'danger' ? 'text-danger' : 'text-muted'}" aria-hidden="true"
        ><Icon size={16} /></span
      >
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
          <h2 class="{headingClass(2)} flex items-center gap-2">{@render headingText()}</h2>
        {:else if heading}
          <h3 class="{headingClass(3)} flex items-center gap-2">{@render headingText()}</h3>
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
