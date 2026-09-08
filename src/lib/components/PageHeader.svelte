<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    /**
     * The title row for a page with no room for one: the title drops to body
     * size and the description is not rendered. A full-height page, a split
     * pane or a canvas, spends every pixel it does not give away.
     */
    compact?: boolean;
    /**
     * Drop the bottom margin, for a caller that owns the rhythm itself.
     *
     * The margin is opt-out rather than removed. Forty-three pages across the
     * estate render this component directly and take their heading gap from
     * it, so deleting it outright would have moved every one of them by 32px
     * with nothing in their own source to explain why.
     */
    flush?: boolean;
    class?: string;
    actions?: Snippet;
  }

  let {
    title,
    description = undefined,
    compact = false,
    flush = false,
    class: klass = '',
    actions,
  }: Props = $props();
</script>

<!-- The margin is stated before the consumer's class so a page can still
     override it, which is the whole reason it is a separate token rather than
     part of the layout: it used to be appended ahead of `klass` unconditionally,
     and a page asking for a different gap shipped two competing margin
     utilities in one attribute with Tailwind's emitted order picking the winner
     rather than the page. -->
<header class="flex flex-wrap items-start justify-between gap-4 {flush ? '' : 'mb-8'} {klass}">
  <div class="min-w-0">
    <!-- The app shells render their own h1 for the current route, so a heading
         lookup by name matches two elements. This names the page's own title. -->
    <!--
      The page title is the one place the brand type scale had a component to
      land on and did not: eighteen type tokens shipped and nothing referenced
      one of them, while this rendered at 24px, a size the ramp does not
      contain.

      text-h2 and not text-h1. The brand ramp is a marketing ramp - it runs
      64 / 44 / 32 / 22 / 16 and holds nothing between 16 and 22, which is
      where a console's own type lives. A 44px page title over a 14px table on
      a 390px screen is the ramp applied rather than adopted. 32px is the step
      the ramp does hold and the step this was already reaching for.

      The weight stays at 700, which is the ramp's H1 weight, because this is
      still the page's h1. Taking H2's 600 along with its size would move the
      title twice for one decision.

      Each size token names its own leading and tracking. A `text-*` token
      built from `--text-*` alone sets font-size and leaves line-height to
      whatever it inherits, which is not the ratio the ramp specifies.
    -->
    <h1
      data-testid="page-title"
      class={compact
        ? 'text-sm font-semibold text-fg'
        : 'text-h2 leading-h2 tracking-h2 font-bold text-fg'}
    >
      {title}
    </h1>
    {#if description && !compact}<p class="mt-1 text-sm text-muted">{description}</p>{/if}
  </div>
  {#if actions}
    <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
  {/if}
</header>
