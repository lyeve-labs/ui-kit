<script lang="ts">
  // The component suite loads no stylesheet unless a case asks for the
  // kit's, so each row states its own height here, and the frame its own
  // scroll box when a case needs the list to scroll.
  import { untrack } from 'svelte';
  import SortableList from '../../src/lib/components/SortableList.svelte';

  type Row = { id: string; label: string };

  let {
    count = 5,
    fields = false,
    refuseFooter = false,
    frame = undefined,
  }: {
    count?: number;
    fields?: boolean;
    refuseFooter?: boolean;
    /** The height of a scroll box around the list, in pixels. */
    frame?: number;
  } = $props();

  const NAMES = ['Hero', 'Features', 'Pricing', 'Quotes', 'Footer'];
  let items = $state<Row[]>(
    Array.from({ length: untrack(() => count) }, (_, i) => ({
      id: `row-${i}`,
      label: NAMES[i] ?? `Row ${i + 1}`,
    })),
  );
  let moves = $state<string[]>([]);
  let added = 0;

  // A caller that changes the rows under a gesture, as a live update does.
  const prepend = () => (items = [{ id: `new-${++added}`, label: 'New' }, ...items]);
  const remove = (label: string) => (items = items.filter((i) => i.label !== label));

  const canMove = (item: Row, _from: number, to: number) =>
    refuseFooter && item.label === 'Footer' && to < items.length - 1
      ? 'The footer stays last.'
      : true;
</script>

<div
  data-testid="frame"
  style={frame === undefined ? undefined : `height:${frame}px;overflow-y:auto`}
>
  <SortableList
    bind:items
    label="Sections"
    {canMove}
    onmove={(m) => moves.push(`${m.item.label} ${m.from} to ${m.to}`)}
  >
    {#snippet row(item)}
      <div style="height:40px;display:flex;align-items:center">
        {#if fields}
          <input aria-label="{item.label} title" value={item.label} />
        {:else}
          <span>{item.label}</span>
        {/if}
      </div>
    {/snippet}
  </SortableList>
</div>
<p data-testid="order">{items.map((i) => i.label).join(', ')}</p>
<p data-testid="moves">{moves.join(', ')}</p>
<button type="button" onclick={prepend}>Add a row at the top</button>
<button type="button" onclick={() => remove('Pricing')}>Delete Pricing</button>
