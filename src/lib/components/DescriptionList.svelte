<script lang="ts">
  /**
   * Key and value pairs, as a real description list.
   *
   * Detail pages laid these out with ad hoc grids of divs, which broke
   * alignment between two pages showing the same record and, more importantly,
   * conveyed nothing: a grid of divs has no relationship between a label and
   * the value under it, so a screen reader reads a run of unattached strings
   * and the listener has to infer which value belongs to which term. `dl`,
   * `dt` and `dd` state that relationship in the markup, and it is the whole
   * reason this component exists.
   *
   * A long value wraps. It is never truncated, because a clipped identifier
   * cannot be read out, cannot be selected and cannot be copied, and an id or
   * a key is exactly the kind of value a detail page is opened for. `break-words`
   * covers the unbroken ones, so a token or a hash wraps instead of pushing the
   * page sideways.
   */
  import type { Snippet } from 'svelte';

  interface Item {
    term: string;
    value: string;
    /** Rendered instead of value when present. */
    detail?: Snippet;
  }

  type Layout = 'inline' | 'stacked';

  interface Props {
    items: Item[];
    /** 'inline' puts the term and value on one row, 'stacked' puts the value under the term. */
    layout?: Layout;
    class?: string;
  }

  let { items, layout = 'inline', class: klass = '' }: Props = $props();

  /**
   * One pair.
   *
   * The `div` between `dl` and its `dt`/`dd` is what HTML allows for grouping a
   * pair, and it is what makes the columns line up across rows: every row runs
   * the same grid, so two pairs stay aligned however long either value is.
   */
  const ROW: Record<Layout, string> = {
    inline: 'grid grid-cols-3 gap-x-4',
    stacked: 'flex flex-col gap-0.5',
  };

  /**
   * `min-w-0` is load bearing on the value. A grid item refuses to shrink below
   * its content by default, so a long unbroken value would widen its column and
   * push the term out of alignment instead of wrapping inside its own.
   */
  const VALUE: Record<Layout, string> = {
    inline: 'col-span-2 min-w-0',
    stacked: '',
  };
</script>

<dl class="flex flex-col gap-2 {klass}">
  <!-- Keyed by term: a description list names each term once, so the term is
       the pair's identity and nothing else in the item is stable. -->
  {#each items as item (item.term)}
    <div class={ROW[layout]}>
      <dt class="text-sm text-muted">{item.term}</dt>
      <dd class="text-sm break-words text-fg {VALUE[layout]}">
        {#if item.detail}
          {@const detail = item.detail}
          {@render detail()}
        {:else}
          {item.value}
        {/if}
      </dd>
    </div>
  {/each}
</dl>
