<script lang="ts">
  /**
   * A heading for a section of a page, with an optional row of controls beside
   * it.
   *
   * Fourteen distinct class strings serve this role across one app, so two
   * sections on the same page render at different sizes and weights, and some
   * of them are a styled `div` that no heading query can find. Taking the level
   * rather than a free-form class means the type treatment cannot disagree with
   * the element, and the element is always a real heading.
   */
  import type { Snippet } from 'svelte';
  import { sectionHeading, type SectionVariant } from '../internal/layout.js';

  interface Props {
    /** 2 under a page title, 3 inside a card. The element, not the treatment. */
    level?: 2 | 3;
    /**
     * `eyebrow` is the small uppercase label the consoles head a band with. It
     * is separate from the level because an eyebrow appears at both, and it was
     * unnamed here while thirty of them shipped hand rolled across two apps.
     */
    variant?: SectionVariant;
    actions?: Snippet;
    class?: string;
    children: Snippet;
  }

  let { level = 2, variant = 'default', actions, class: klass = '', children }: Props = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-4 {klass}">
  <!-- Two branches rather than one dynamic element: the level is a document
       structure decision, and a reader of this file should be able to see both
       headings it can produce. -->
  {#if level === 2}
    <h2 class={sectionHeading(2, variant)}>{@render children()}</h2>
  {:else}
    <h3 class={sectionHeading(3, variant)}>{@render children()}</h3>
  {/if}

  {#if actions}
    <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
  {/if}
</div>
