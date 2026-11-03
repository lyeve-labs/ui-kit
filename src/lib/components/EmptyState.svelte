<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    icon?: string;
    iconSnippet?: Snippet;
    title: string;
    /**
     * The title's heading level. 3 by default, for a list inside a section. 2
     * on a page whose only other heading is its title, so a screen reader does
     * not meet a jump from h1 to h3.
     */
    level?: 2 | 3;
    description?: string;
    class?: string;
    action?: Snippet;
    children?: Snippet;
  }

  let {
    icon = undefined,
    iconSnippet = undefined,
    title,
    level = 3,
    description = undefined,
    class: klass = '',
    action,
    children,
  }: Props = $props();
</script>

<!-- The hero wash: the page's ink into a tenth of violet, under a solid 1px
     border. It was a dashed outline on a translucent surface, which read as a
     slot left unfilled rather than as a place something will appear. The
     medallion is a raised control in miniature, and its icon takes the brand
     color. The contrast suite measures every text token against both ends of
     the wash. -->
<div
  class="flex flex-col items-center justify-center text-center rounded-card border border-line bg-ink bg-hero inset-shadow-card px-6 py-12 {klass}"
>
  {#if iconSnippet}
    <div
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-brand inset-shadow-highlight shadow-raised"
      aria-hidden="true"
    >
      {@render iconSnippet()}
    </div>
  {:else if icon}
    <div
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-2xl inset-shadow-highlight shadow-raised"
      aria-hidden="true"
    >
      {icon}
    </div>
  {/if}
  <!-- Two branches rather than one dynamic element, as in SectionHeading:
       a reader of this file can see both headings it can produce. -->
  {#if level === 2}
    <h2 class="text-base font-semibold text-fg">{title}</h2>
  {:else}
    <h3 class="text-base font-semibold text-fg">{title}</h3>
  {/if}
  {#if description}
    <p class="mt-1 max-w-sm text-sm text-muted">{description}</p>
  {/if}
  {#if children}<div class="mt-1 max-w-sm text-sm text-muted">{@render children()}</div>{/if}
  {#if action}
    <div class="mt-5">{@render action()}</div>
  {/if}
</div>
