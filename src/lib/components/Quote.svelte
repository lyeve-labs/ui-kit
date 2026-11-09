<script lang="ts">
  /**
   * A quotation and who said it, set off by a rule in the site's second color.
   * The rule marks the quote and carries no information, so it is held to no
   * contrast floor. The words stay in the body text color.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    /** Who said it, drawn under the quotation. */
    source?: string;
    /** The quotation, which sits in a paragraph. */
    children: Snippet;
    class?: string;
  }

  let { source = undefined, children, class: klass = '' }: Props = $props();
</script>

<figure class="m-0 border-s-4 border-brand-2 ps-site-md {klass}">
  <blockquote class="m-0 font-heading text-xl text-fg">
    <p class="m-0">{@render children()}</p>
  </blockquote>
  {#if source}
    <figcaption class="mt-site-xs text-sm text-muted">{source}</figcaption>
  {/if}
</figure>
