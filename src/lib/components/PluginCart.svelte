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
  import { X } from '@lucide/svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import FilterChips from './FilterChips.svelte';
  import SearchInput from './SearchInput.svelte';
  import Spinner from './Spinner.svelte';
  import * as motion from '../motion.js';
  import { cn } from '../utils/cn.js';
  import { CHOICE_FOCUS, CHOICE_INPUT, CHOICE_MARK, choiceWrap } from '../internal/choice.js';
  import { HIT_AREA } from '../internal/touch.js';
  import {
    betaOf,
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
    /**
     * How far below the top of the window the summary sticks on a wide
     * screen, as a CSS length. A page with a sticky header passes its height,
     * so the summary does not slide under it.
     */
    stickyTop?: string;
    class?: string;
  }

  /**
   * What a reader brought from another surface, minus anything the catalog no
   * longer sells or they already pay for.
   *
   * Called in the destructuring default rather than an effect, because an
   * effect runs only in the browser. The server render is the whole page for a
   * reader with no JavaScript, and seeding there showed an empty cart to
   * somebody who had just filled one.
   */
  function seed(all: CartPlugin[], owned: string[], brought: string[]): Set<string> {
    const sells = new Set(all.map((p) => p.sku));
    const has = new Set(owned);
    return new Set(brought.filter((s) => sells.has(s) && !has.has(s)));
  }

  let {
    plugins,
    brackets = [],
    initial = [],
    held = [],
    selected = $bindable(seed(plugins, held, initial)),
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
    stickyTop = '1rem',
    class: klass = '',
  }: Props = $props();

  const summaryId = $props.id();
  const heldSet = $derived(new Set(held));
  const known = $derived(new Set(plugins.map((p) => p.sku)));

  let query = $state('');
  let category = $state('all');

  const sellable = $derived(plugins.filter((p) => p.status !== 'soon'));

  // Every category with how many it holds, so a reader sees where the bulk of
  // the catalog is before choosing one.
  const categories = $derived([
    { value: 'all', label: 'All', count: sellable.length },
    ...[...new Set(sellable.map((p) => p.category).filter(Boolean) as string[])]
      .sort()
      .map((c) => ({ value: c, label: c, count: sellable.filter((p) => p.category === c).length })),
  ]);

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
    quoted
      ? period === 'annual'
        ? (quoted.annual_total_cents ?? null)
        : quoted.total_cents
      : null,
  );

  const ladder = $derived(
    ladderState(
      brackets,
      billedCount({ selected, held, change: held.length > 0, pricedSkus: billedSkus }),
    ),
  );

  const perLabel = $derived(period === 'annual' ? '/yr' : '/mo');

  // The volume ladder drawn as a meter: the rungs that take something off,
  // placed along the count of the last one.
  const rungs = $derived(
    [...brackets].filter((b) => b.discount_pct > 0).sort((a, b) => a.plugins - b.plugins),
  );
  const ladderTop = $derived(rungs.length ? rungs[rungs.length - 1].plugins : 0);
  const ladderFill = $derived(ladderTop ? Math.min(ladder.count / ladderTop, 1) * 100 : 0);

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
    <SearchInput
      label="Search capabilities"
      placeholder="Search by name or what it does"
      bind:value={query}
    />

    {#if quickPicks.length > 0}
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-medium text-muted">Start from</span>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
          {#each quickPicks as qp (qp.id)}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onclick={() => pick(qp.skus)}
              disabled={qp.skus.length === 0}
            >
              {qp.label}
            </Button>
          {/each}
        </div>
      </div>
    {/if}

    {#if categories.length > 2}
      <!-- Chips that wrap rather than a strip that scrolls: every category is
           in sight at every width, and none hides past the edge. -->
      <FilterChips
        label="Category"
        countLabel="on sale"
        options={categories}
        bind:value={category}
      />
    {/if}

    {#if shown.length === 0}
      <p class="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
        Nothing matches that search.
      </p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {#each shown as plugin (plugin.sku)}
          {@const owned = heldSet.has(plugin.sku)}
          {@const on = selected.has(plugin.sku) || owned}
          {@const blurb = betaOf(plugin.blurb, plugin.maturity)}
          {@const id = `${summaryId}-${plugin.sku}`}
          {@const tagged = Boolean(plugin.category || blurb.beta || owned)}
          <!-- One card is one control: the input covers it, so the card is
               what the focus outline reaches, the way the kit's card checkbox
               works. The name names the box and the blurb describes it. -->
          <label class="relative block h-full">
            <input
              type="checkbox"
              class={CHOICE_INPUT}
              name={fieldName}
              value={plugin.sku}
              checked={on}
              disabled={owned}
              aria-labelledby="{id}-name"
              aria-describedby="{id}-price {id}-blurb{tagged ? ` ${id}-tags` : ''}"
              onchange={() => toggle(plugin.sku)}
            />
            <span
              class={cn(choiceWrap('card', on, owned), CHOICE_FOCUS, 'h-full flex-col gap-2 p-4')}
            >
              <span class="flex w-full items-start justify-between gap-3">
                <span class="flex min-w-0 items-start gap-2.5">
                  <span
                    class={cn(
                      'pointer-events-none mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors',
                      on ? 'border-brand bg-brand text-ink' : 'border-line-strong bg-surface-2',
                    )}
                    aria-hidden="true"
                  >
                    {#if on}
                      <svg
                        viewBox="0 0 10 8"
                        class="size-2.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"><path d={CHOICE_MARK.check} /></svg
                      >
                    {/if}
                  </span>
                  <!-- A one-word name longer than the space beside the price breaks
                       with a hyphen rather than running under it. -->
                  <span
                    id="{id}-name"
                    class="min-w-0 text-sm font-semibold leading-snug text-fg hyphens-auto [overflow-wrap:anywhere]"
                    >{plugin.name}</span
                  >
                </span>
                <span id="{id}-price" class="shrink-0 font-mono text-sm font-semibold text-fg">
                  {formatCents(plugin.price_cents, currency)}<span
                    class="text-xs font-normal text-muted">/mo</span
                  >
                </span>
              </span>
              <span id="{id}-blurb" class="text-xs leading-relaxed text-muted">
                {owned ? 'Already on your subscription.' : blurb.text}
              </span>
              {#if tagged}
                <span id="{id}-tags" class="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {#if plugin.category}<Badge tone="neutral" size="sm">{plugin.category}</Badge
                    >{/if}
                  {#if blurb.beta}<Badge tone="violet" size="sm">Beta</Badge>{/if}
                  {#if owned}<Badge tone="success" size="sm">Owned</Badge>{/if}
                </span>
              {/if}
            </span>
          </label>
        {/each}
      </div>
    {/if}

    {#if count > 0}
      <!-- On a narrow screen the summary sits under every card. This keeps
           the count and the price in sight and one tap from the summary. -->
      <div class="sticky bottom-3 lg:hidden" transition:motion.toast|global>
        <a
          href="#{summaryId}"
          class="flex items-center justify-between gap-3 rounded-xl border border-brand bg-surface px-4 py-3 text-sm shadow-lg transition-colors hover:bg-surface-2"
        >
          <span class="text-fg">
            <span class="font-semibold">{count}</span> picked{#if total !== null}<span
                class="text-muted"
              >
                ·
              </span><span class="font-mono">{formatCents(total, currency)}{perLabel}</span>{/if}
          </span>
          <span class="font-semibold text-brand">Review</span>
        </a>
      </div>
    {/if}
  </div>

  <aside
    id={summaryId}
    class="scroll-mt-20 self-start rounded-xl border border-line bg-surface p-5 lg:sticky"
    style:top={stickyTop}
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

      {#if rungs.length > 0}
        <!-- The ladder as a meter, so "two more" is something a reader can
             see the distance to. -->
        <div class="mb-3" aria-hidden="true">
          <div class="relative h-1.5 rounded-full bg-surface-2">
            <span
              class="absolute inset-y-0 start-0 rounded-full bg-brand transition-[width] duration-progress"
              style:width="{ladderFill}%"
            ></span>
            {#each rungs as r (r.plugins)}
              <span
                class={cn(
                  'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors',
                  ladder.count >= r.plugins
                    ? 'border-brand bg-brand'
                    : 'border-line-strong bg-surface',
                )}
                style:left="{(r.plugins / ladderTop) * 100}%"
              ></span>
            {/each}
          </div>
          <div class="relative mt-2 h-4 text-[10px] text-muted">
            {#each rungs as r (r.plugins)}
              <span
                class="absolute -translate-x-1/2 whitespace-nowrap font-mono"
                style:left="{Math.min((r.plugins / ladderTop) * 100, 92)}%"
              >
                {r.plugins}+ · {r.discount_pct}%
              </span>
            {/each}
          </div>
        </div>
      {/if}

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
