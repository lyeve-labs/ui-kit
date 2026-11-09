<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import {
    CARD_FOOTER,
    CARD_HEADER,
    CARD_PAD,
    CARD_SURFACE,
    sectionHeading,
  } from '../internal/layout.js';
  import Image, { type ImageRatio } from './Image.svelte';

  type Pad = 'none' | 'sm' | 'md' | 'lg';

  interface Props {
    title?: string;
    description?: string;
    /**
     * The card's own heading. `header` wins over `heading`, and `heading` over
     * `title`. Renders the icon, a heading element at `headingLevel` and the
     * `meta` row. Set one of the three.
     */
    heading?: string;
    /** 2 under a page title, 3 inside another card. */
    headingLevel?: 2 | 3;
    /** Drawn before the heading. Decorative, so it carries no name of its own. */
    icon?: Component<{ size?: number; class?: string }>;
    /** A count, a status or a timestamp, at the end of the heading row. */
    meta?: string;
    /**
     * Drawn edge to edge above the heading. With its own width and height it
     * keeps its shape, and without them it is cropped to `ratio`.
     */
    image?: { src: string; alt: string; width?: number; height?: number; ratio?: ImageRatio };
    pad?: Pad;
    hover?: boolean;
    class?: string;
    header?: Snippet;
    footer?: Snippet;
    onclick?: (e: MouseEvent) => void;
    onkeydown?: (e: KeyboardEvent) => void;
    children: Snippet;
  }

  let {
    title = undefined,
    description = undefined,
    heading = undefined,
    headingLevel = 3,
    icon = undefined,
    meta = undefined,
    image = undefined,
    pad = 'md',
    hover = false,
    class: klass = '',
    header,
    footer,
    onclick,
    onkeydown,
    children,
  }: Props = $props();

  /**
   * A clickable Card advertises itself as a button and used to do nothing when
   * you pressed one. It took `role="button"` and `tabindex="0"` from `onclick`
   * alone, so it entered the tab order and then ignored Enter and Space unless
   * the page happened to pass its own `onkeydown`. Native button semantics are
   * the contract here, so the component honors them itself and still forwards
   * whatever the consumer supplied.
   */
  function activate(e: KeyboardEvent) {
    onkeydown?.(e);
    if (!onclick || e.defaultPrevented) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // Space scrolls the page on a non-button element.
    e.preventDefault();
    (e.currentTarget as HTMLElement).click();
  }
</script>

<!-- tabindex is only set alongside role="button" (when onclick is provided),
     so the element is interactive. The compiler can't narrow the dynamic role. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- The surface is the layout contract's, so a Card and a bordered Panel on
     one page agree. A hover card, and any clickable one, takes a cyan border
     under the pointer, so it answers the way a button does. Its shadow never
     changes, and focus is the global outline alone.

     Only a card whose content reaches its edge (pad none) clips it to the
     rounded corners. A padded card clipped a list that opened from its last
     field, so the card grew to hold the list instead of the list opening
     over the page. The footer band rounds its own corners. -->
<div
  data-print="keep"
  class="{CARD_SURFACE} {pad === 'none' ? 'overflow-hidden' : ''} transition-colors {hover ||
  onclick
    ? 'hover:border-brand/50'
    : ''} {onclick ? 'cursor-pointer' : ''} {klass}"
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
  {onclick}
  onkeydown={onclick ? activate : onkeydown}
>
  {#if image}
    <!-- The card keeps its own overflow, so a list opening from a field still
         draws over the page. Only the picture is clipped to the top corners,
         and it drops its own rounding. -->
    <div class="overflow-hidden rounded-t-card [&_img]:w-full [&_img]:rounded-none">
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        ratio={image.ratio}
      />
    </div>
  {/if}

  {#if header || heading || title}
    <div class={CARD_HEADER}>
      {#if header}
        {@render header()}
      {:else if heading}
        <div class="flex items-center gap-2">
          {#if icon}
            {@const Icon = icon}
            <Icon size={16} class="shrink-0 text-faint" />
          {/if}
          <!-- Two branches rather than one dynamic element: the level is a
               document structure decision, and a reader of this file should be
               able to see both headings the card can produce. -->
          {#if headingLevel === 2}
            <h2 class={sectionHeading(2)}>{heading}</h2>
          {:else}
            <h3 class={sectionHeading(3)}>{heading}</h3>
          {/if}
          {#if meta}<span class="ms-auto shrink-0 text-xs text-faint">{meta}</span>{/if}
        </div>
        {#if description}<p class="text-sm text-muted mt-0.5">{description}</p>{/if}
      {:else}
        <h3 class="font-heading font-semibold text-fg">{title}</h3>
        {#if description}<p class="text-sm text-muted mt-0.5">{description}</p>{/if}
      {/if}
    </div>
  {/if}

  <div class={CARD_PAD[pad]}>
    {@render children()}
  </div>

  {#if footer}
    <div class={CARD_FOOTER}>
      {@render footer()}
    </div>
  {/if}
</div>
