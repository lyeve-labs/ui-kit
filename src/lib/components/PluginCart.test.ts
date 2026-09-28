import { fireEvent, render, within } from '@testing-library/svelte';

import { describe, expect, it, vi } from 'vitest';
import PluginCart from './PluginCart.svelte';
import type { CartQuote } from '../internal/pricing.js';

const PLUGINS = [
  { sku: 'plugin-graphql', name: 'GraphQL', price_cents: 800, category: 'API', blurb: 'A typed API.' },
  { sku: 'plugin-audit', name: 'Audit', price_cents: 500, category: 'Compliance', blurb: 'Who did what.' },
  { sku: 'plugin-soon', name: 'Later', price_cents: 100, category: 'API', status: 'soon' },
];

const BRACKETS = [
  { plugins: 2, discount_pct: 5 },
  { plugins: 4, discount_pct: 10 },
];

function quoteFor(skus: string[], total: number): CartQuote {
  return {
    items: skus.map((sku) => ({ sku, name: sku, unit_cents: 0, discounted_cents: 0 })),
    count: skus.length,
    subtotal_cents: total,
    volume_discount_pct: 0,
    volume_discount_cents: 0,
    community_discount_pct: 0,
    community_discount_cents: 0,
    total_cents: total,
  };
}

describe('PluginCart', () => {
  it('lists what sells and leaves out what is only announced', () => {
    const { getByLabelText, queryByLabelText } = render(PluginCart, { props: { plugins: PLUGINS } });
    expect(getByLabelText(/GraphQL/)).toBeTruthy();
    expect(queryByLabelText(/Later/)).toBeNull();
  });

  it('posts each choice under a field name, so a form still works with no JavaScript', () => {
    const { container } = render(PluginCart, { props: { plugins: PLUGINS, fieldName: 'sku' } });
    const boxes = container.querySelectorAll('input[type="checkbox"][name="sku"]');
    expect(boxes.length).toBe(2);
    expect([...boxes].map((b) => (b as HTMLInputElement).value)).toContain('plugin-graphql');
  });

  it('reports the selection when one is picked', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(PluginCart, { props: { plugins: PLUGINS, onchange } });
    await fireEvent.click(getByLabelText(/GraphQL/));
    expect(onchange).toHaveBeenCalledWith(['plugin-graphql']);
  });

  it('seeds itself from a selection made on another surface', () => {
    const { getByRole } = render(PluginCart, {
      props: { plugins: PLUGINS, initial: ['plugin-audit'] },
    });
    expect((getByRole('checkbox', { name: /Audit/ }) as HTMLInputElement).checked).toBe(true);
  });


  it('shows a held capability as owned and refuses to sell it twice', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(PluginCart, {
      props: { plugins: PLUGINS, held: ['plugin-audit'], onchange },
    });
    const box = getByRole('checkbox', { name: /Audit/ }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
    await fireEvent.click(box);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('shows the server total and never computes one', () => {
    const { getByText } = render(PluginCart, {
      props: {
        plugins: PLUGINS,
        selected: new Set(['plugin-graphql']),
        quote: quoteFor(['plugin-graphql'], 777),
        quotePeriod: 'monthly',
      },
    });
    // 777, not the 800 the catalog lists. The server decides.
    expect(getByText(/\$7\.77/)).toBeTruthy();
  });

  it('withholds a total that was priced for a different selection', () => {
    const { queryByText, getByText } = render(PluginCart, {
      props: {
        plugins: PLUGINS,
        selected: new Set(['plugin-graphql', 'plugin-audit']),
        quote: quoteFor(['plugin-graphql'], 800),
        quotePeriod: 'monthly',
        quoting: true,
      },
    });
    // No total line at all, rather than a total that describes a smaller cart.
    expect(queryByText('Total')).toBeNull();
    expect(getByText(/Pricing your selection/)).toBeTruthy();
  });

  it('withholds a monthly total when the reader asked for a year', () => {
    const { queryByText, getByText } = render(PluginCart, {
      props: {
        plugins: PLUGINS,
        selected: new Set(['plugin-graphql']),
        quote: quoteFor(['plugin-graphql'], 800),
        quotePeriod: 'monthly',
        period: 'annual',
      },
    });
    expect(queryByText('Total')).toBeNull();
    expect(getByText(/Waiting for a price/)).toBeTruthy();
  });

  it('says how far the next volume rung is', () => {
    const { getByText } = render(PluginCart, {
      props: { plugins: PLUGINS, brackets: BRACKETS, selected: new Set(['plugin-graphql']) },
    });
    expect(getByText(/1 more and the discount is 5%/)).toBeTruthy();
  });

  it('replaces the whole selection from a quick pick', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(PluginCart, {
      props: {
        plugins: PLUGINS,
        selected: new Set(['plugin-graphql']),
        quickPicks: [{ id: 'all', label: 'Everything', skus: ['plugin-graphql', 'plugin-audit'] }],
        onchange,
      },
    });
    await fireEvent.click(within(getByRole('group', { name: 'Quick picks' })).getByText('Everything'));
    expect(onchange).toHaveBeenCalledWith(['plugin-graphql', 'plugin-audit']);
  });

  it('tells an empty cart it is already on the free tier', () => {
    const { getByText } = render(PluginCart, { props: { plugins: PLUGINS } });
    expect(getByText(/free tier, which needs no checkout/)).toBeTruthy();
  });
});
