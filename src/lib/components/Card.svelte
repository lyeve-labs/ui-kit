<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { sectionHeading } from '../internal/layout.js';

  type Pad = 'none' | 'sm' | 'md' | 'lg';

  interface Props {
    title?: string;
    description?: string;
    /**
     * The card's own section heading.
     *
     * The header band has three ways in, and they resolve in this order:
     * `header` wins over everything, then `heading`, then `title`. A caller who
     * hands a snippet has already decided what the band contains, so the
     * component adds nothing to it. `heading` renders the icon, a real heading
     * element at the level the caller names, and the meta row that seven
     * hand-rolled section shells wrote out for themselves. `title` predates it
     * and still renders exactly what it always did, so the cards already
     * shipping do not move. Set one of the three.
     */
    heading?: string;
    /** 2 under a page title, 3 inside another card. */
    headingLevel?: 2 | 3;
    /** Drawn before the heading. Decorative, so it carries no name of its own. */
    icon?: Component<{ size?: number; class?: string }>;
    /** A count, a status or a timestamp, at the end of the heading row. */
    meta?: string;
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
   * the contract here, so the component honours them itself and still forwards
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

  const pads: Record<Pad, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };
</script>

<!-- tabindex is only set alongside role="button" (when onclick is provided),
     so the element is interactive; the compiler can't narrow the dynamic role. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="bg-surface border border-line rounded-xl overflow-hidden transition-colors duration-150 {hover
    ? 'hover:border-line/0 hover:ring-1 hover:ring-brand/30'
    : ''} {onclick ? 'cursor-pointer' : ''} {klass}"
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
  {onclick}
  onkeydown={onclick ? activate : onkeydown}
>
  {#if header || heading || title}
    <div class="px-5 py-4 border-b border-line">
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
          {#if meta}<span class="ml-auto shrink-0 text-xs text-faint">{meta}</span>{/if}
        </div>
        {#if description}<p class="text-sm text-muted mt-0.5">{description}</p>{/if}
      {:else}
        <h3 class="font-semibold text-fg">{title}</h3>
        {#if description}<p class="text-sm text-muted mt-0.5">{description}</p>{/if}
      {/if}
    </div>
  {/if}

  <div class={pads[pad]}>
    {@render children()}
  </div>

  {#if footer}
    <div class="px-5 py-3 border-t border-line bg-surface-2/40">
      {@render footer()}
    </div>
  {/if}
</div>
