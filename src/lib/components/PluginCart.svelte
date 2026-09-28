<!--
  The capability picker and its running summary, for every surface that sells.

  It renders, it never prices. The total, the discount and the annual figure
  all come in as a quote the server made, and `quoted` below refuses to show
  one that no longer describes what is selected. A host that wants a fresh
  price listens to `onchange` and fetches one: a form action where there is a
  server beside the page, the public quote endpoint where there is not.

  The checkboxes carry a name and a value, so a host that wraps this in a form
  still posts the selection with no JavaScript running at all.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { X } from '@lucide/svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Checkbox from './Checkbox.svelte';
  import SearchInput from './SearchInput.svelte';
  import SegmentedControl from './SegmentedControl.svelte';
  import Spinner from './Spinner.svelte';
  import { cn } from '../utils/cn.js';
  import {
    billedCount,
    formatCents,
    ladderState,
    type BillingPeriod,
    type CartPlugin,
    type CartQuote,
    type DiscountBracket,
  } from '../internal/pricing.js';

  /** One button that replaces the whole selection. */
  export interface QuickPick {
    id: string;
    label: string;
    skus: string[];
  }

  interface Props {
    plugins: CartPlugin[];
    brackets?: DiscountBracket[];
    /** What the reader has picked. Bindable, so the host can price it. */
    selected?: Set<string>;
    /** Picked before arriving, from another surface's cart. Seeds `selected`. */
    initial?: string[];
    /** Already paid for. Shown, never added twice. */
    held?: string[];
    /** The server's price for this selection, or null before one exists. */
    quote?: CartQuote | null;
    /** The period that quote was priced for. A monthly quote says nothing about a year. */
    quotePeriod?: BillingPeriod | null;
    period?: BillingPeriod;
    /** True while a fresh price is in flight. */
    quoting?: boolean;
    /** The count the bill will carry, when the host knows better than the cart. */
    billedSkus?: string[] | null;
    currency?: string;
    /** The form field each checkbox posts under, for the path with no JavaScript. */
    fieldName?: string;
    error?: string | null;
    quickPicks?: QuickPick[];
    /** Called with the new selection whenever it changes. */
    onchange?: (skus: string[]) => void;
    /** The host's call to action, under the total. */
    actions?: Snippet<[{ skus: string[]; total: number | null }]>;
    /** Anything the host wants between the total and the actions. */
    notice?: Snippet;
    class?: string;
  }

  let {
    plugins,
    brackets = [],
    selected = $bindable(new Set<string>()),
    initial = [],
    held = [],
    quote = null,
    quotePeriod = null,
    period = 'monthly',
    quoting = false,
    billedSkus = null,
    currency = 'USD',
    fieldName = 'sku',
    error = null,
    quickPicks = [],
    onchange,
    actions,
    notice,
    class: klass = '',
  }: Props = $props();

  const heldSet = $derived(new Set(held));
  const known = $derived(new Set(plugins.map((p) => p.sku)));

  // Seeded synchronously rather than in an effect. An effect runs only in the
  // browser, so a server render, which is the whole page for a reader with no
  // JavaScript, showed an empty cart to someone who had just filled one.
  let seeded = false;
  $effect.pre(() => {
    if (seeded || initial.length === 0) return;
    seeded = true;
    const from = untrack(() => new Set(initial.filter((s) => known.has(s) && !heldSet.has(s))));
    if (from.size > 0) selected = from;
  });

  let query = $state('');
  let category = $state('all');

  const categories = $derived([
    { value: 'all', label: 'All' },
    ...[...new Set(plugins.map((p) => p.category).filter(Boolean) as string[])]
      .sort()
      .map((c) => ({ value: c, label: c })),
  ]);

  const sellable = $derived(plugins.filter((p) => p.status !== 'soon'));

  const shown = $derived(
    sellable.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.blurb ?? '').toLowerCase().includes(q) ||
        p.sku.includes(q)
      );
    }),
  );

  const bySku = $derived(new Map(plugins.map((p) => [p.sku, p])));
  const count = $derived(selected.size);

  // A price counts only for the exact selection and period it was made for.
  // Anything else is a number that used to be true, which is worse on a page
  // about to charge someone than no number at all.
  const quoted = $derived(
    quote &&
      (quotePeriod ?? 'monthly') === period &&
      quote.count === count &&
      quote.items.every((i) => selected.has(i.sku))
      ? quote
      : null,
  );

  const total = $derived(
    quoted ? (period === 'annual' ? (quoted.annual_total_cents ?? null) : quoted.total_cents) : null,
  );

  const ladder = $derived(
    ladderState(
      brackets,
      billedCount({ selected, held, change: held.length > 0, pricedSkus: billedSkus }),
    ),
  );

  const perLabel = $derived(period === 'annual' ? '/yr' : '/mo');

  function commit(next: Set<string>) {
    selected = next;
    onchange?.([...next]);
  }

  function toggle(sku: string) {
    if (heldSet.has(sku)) return;
    const next = new Set(selected);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    commit(next);
  }

  function pick(skus: string[]) {
    commit(new Set(skus.filter((s) => known.has(s) && !heldSet.has(s))));
  }
</script>

<div class={cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]', klass)}>
  <div class="min-w-0 space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-48 flex-1">
        <SearchInput
          label="Search capabilities"
          placeholder="Search by name or what it does"
          bind:value={query}
        />
      </div>
      {#if quickPicks.length > 0}
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
          {#each quickPicks as qp (qp.id)}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onclick={() => pick(qp.skus)}
              disabled={qp.skus.length === 0}
            >
              {qp.label}
            </Button>
          {/each}
        </div>
      {/if}
    </div>

    {#if categories.length > 2}
      <div class="-mx-1 overflow-x-auto px-1">
        <SegmentedControl
          options={categories}
          bind:value={category}
          label="Category"
          labelHidden
          size="sm"
        />
      </div>
    {/if}

    {#if shown.length === 0}
      <p class="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
        Nothing matches that search.
      </p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {#each shown as plugin (plugin.sku)}
          {@const owned = heldSet.has(plugin.sku)}
          <Checkbox
            variant="card"
            name={fieldName}
            value={plugin.sku}
            label={plugin.name}
            description={owned
              ? 'Already on your subscription'
              : `${formatCents(plugin.price_cents, currency)}/mo${plugin.category ? `, ${plugin.category}` : ''}. ${plugin.blurb ?? ''}`}
            checked={selected.has(plugin.sku) || owned}
            disabled={owned}
            onchange={() => toggle(plugin.sku)}
          />
        {/each}
      </div>
    {/if}
  </div>

  <aside
    class="self-start rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-4"
    aria-label="Your selection"
  >
    <div class="mb-4 flex items-center justify-between gap-2">
      <p class="text-xs font-semibold uppercase tracking-widest text-faint">Your selection</p>
      {#if count > 0}
        <Badge tone="brand" size="sm">
          {count}
          {count === 1 ? 'capability' : 'capabilities'}
        </Badge>
      {/if}
    </div>

    {#if error}
      <p class="mb-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
        {error}
      </p>
    {/if}

    {#if count === 0}
      <p class="py-6 text-center text-sm text-muted">
        Nothing picked yet. With none of these you are on the free tier, which needs no checkout.
      </p>
    {:else}
      <ul class="mb-4 max-h-56 space-y-1 overflow-y-auto pe-1">
        {#each [...selected] as sku (sku)}
          {@const p = bySku.get(sku)}
          <li class="flex items-center justify-between gap-2 text-xs">
            <span class="truncate text-fg">{p?.name ?? sku}</span>
            <span class="flex items-center gap-1">
              <span class="font-mono text-muted">{formatCents(p?.price_cents ?? 0, currency)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onclick={() => toggle(sku)}
                aria-label={`Take ${p?.name ?? sku} out of your selection`}
              >
                <X size={12} />
              </Button>
            </span>
          </li>
        {/each}
      </ul>

      {#if ladder.reachedPct > 0}
        <p class="mb-2 text-xs text-success">
          Volume discount {ladder.reachedPct}% applied.
        </p>
      {/if}
      {#if ladder.next}
        <p class="mb-3 text-xs text-muted">
          {ladder.next.more} more and the discount is {ladder.next.discount_pct}%.
        </p>
      {/if}

      <div class="mb-4 border-t border-line pt-3">
        {#if total === null}
          <p class="flex items-center gap-2 text-sm text-muted">
            {#if quoting}
              <Spinner size={14} />
              Pricing your selection
            {:else}
              Waiting for a price.
            {/if}
          </p>
        {:else}
          <p class="flex items-baseline justify-between gap-2">
            <span class="text-sm text-muted">Total</span>
            <span class="font-mono text-xl font-semibold text-fg">
              {formatCents(total, currency)}<span class="text-sm font-normal text-muted"
                >{perLabel}</span
              >
            </span>
          </p>
          {#if quoted && quoted.volume_discount_cents > 0}
            <p class="mt-1 text-end text-xs text-muted">
              {formatCents(quoted.volume_discount_cents, currency)} off the list price.
            </p>
          {/if}
          {#if quoted && quoted.community_discount_cents > 0}
            <p class="mt-1 text-end text-xs text-success">
              Community discount {quoted.community_discount_pct}% applied.
            </p>
          {/if}
        {/if}
      </div>
    {/if}

    {#if notice}{@render notice()}{/if}
    {#if actions}{@render actions({ skus: [...selected], total })}{/if}
  </aside>
</div>
