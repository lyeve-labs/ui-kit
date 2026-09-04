import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import DescriptionList from './DescriptionList.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const items = [
  { term: 'Status', value: 'Active' },
  { term: 'Plan', value: 'Team' },
  { term: 'Created', value: '2026-01-14' },
];

describe('DescriptionList', () => {
  it('renders a real dl with a dt and a dd for every pair', () => {
    // The grids of divs this replaces carried no relationship at all, so a
    // screen reader read a run of unattached strings.
    const { container } = render(DescriptionList, { props: { items } });
    const dl = container.querySelector('dl') as HTMLElement;
    expect(dl).toBeTruthy();
    expect(dl.querySelectorAll('dt')).toHaveLength(3);
    expect(dl.querySelectorAll('dd')).toHaveLength(3);
  });

  it('pairs each value with its own term', () => {
    const { container } = render(DescriptionList, { props: { items } });
    const groups = Array.from(container.querySelectorAll('dl > div'));
    expect(groups).toHaveLength(3);
    expect(
      groups.map((g) => [
        g.querySelector('dt')?.textContent,
        g.querySelector('dd')?.textContent?.trim(),
      ]),
    ).toEqual([
      ['Status', 'Active'],
      ['Plan', 'Team'],
      ['Created', '2026-01-14'],
    ]);
    // Adjacency as well as grouping: a dd that is not the term's next sibling
    // reads as belonging to whichever dt came before it.
    for (const group of groups) {
      expect(group.querySelector('dt')?.nextElementSibling).toBe(group.querySelector('dd'));
    }
  });

  it('keeps a pair together when the list is reordered', async () => {
    // Keyed on the term, which a description list names once. An unkeyed each
    // rewrites the rows in place and can leave a value under another term.
    const { container, rerender } = render(DescriptionList, { props: { items } });
    await rerender({ items: [items[2], items[0], items[1]] });
    const groups = Array.from(container.querySelectorAll('dl > div'));
    expect(
      groups.map((g) => [
        g.querySelector('dt')?.textContent,
        g.querySelector('dd')?.textContent?.trim(),
      ]),
    ).toEqual([
      ['Created', '2026-01-14'],
      ['Status', 'Active'],
      ['Plan', 'Team'],
    ]);
  });

  it('wraps a long value rather than truncating it', () => {
    // A truncated identifier is worse than a wrapped one: it cannot be read
    // out, cannot be selected and cannot be copied, and an id is what a detail
    // page is usually opened for.
    const key = `sk_live_${'b3f9c1d2'.repeat(8)}`;
    const { container } = render(DescriptionList, {
      props: { items: [{ term: 'API key', value: key }] },
    });
    const dd = container.querySelector('dd') as HTMLElement;
    expect(dd.textContent?.trim()).toBe(key);
    expect(dd.className).toContain('break-words');
    for (const clip of ['truncate', 'text-ellipsis', 'whitespace-nowrap', 'line-clamp']) {
      expect(dd.className, `${clip} clips the value`).not.toContain(clip);
    }
  });

  it('renders the detail snippet instead of the value', () => {
    const { container, getByText, queryByText } = render(DescriptionList, {
      props: { items: [{ term: 'Owner', value: 'ana@example.com', detail: text('Ana Ruiz') }] },
    });
    expect(getByText('Ana Ruiz')).toBeTruthy();
    expect(queryByText('ana@example.com')).toBeNull();
    // Still inside the dd, so the pairing holds for a rendered value too.
    expect(container.querySelector('dd')?.textContent?.trim()).toBe('Ana Ruiz');
  });

  it('puts the term and the value on one row when inline', () => {
    const { container } = render(DescriptionList, { props: { items } });
    const group = container.querySelector('dl > div') as HTMLElement;
    expect(group.className).toContain('grid');
    expect(group.className).toContain('grid-cols-3');
    expect(container.querySelector('dd')?.className).toContain('col-span-2');
  });

  it('puts the value under the term when stacked', () => {
    const { container } = render(DescriptionList, { props: { items, layout: 'stacked' } });
    const group = container.querySelector('dl > div') as HTMLElement;
    expect(group.className).toContain('flex-col');
    expect(group.className).not.toContain('grid');
    expect(container.querySelector('dd')?.className).not.toContain('col-span-2');
  });

  it('renders an empty list as an empty dl rather than as nothing', () => {
    const { container } = render(DescriptionList, { props: { items: [] } });
    expect(container.querySelector('dl')).toBeTruthy();
    expect(container.querySelectorAll('dt')).toHaveLength(0);
  });

  it('accepts a consumer class without competing with a built-in utility', () => {
    // A margin is safe here because the list states none of its own; two
    // utilities for one property resolve by the order Tailwind emits them and
    // not by the order they were written.
    const { container } = render(DescriptionList, { props: { items, class: 'mt-2' } });
    const dl = container.querySelector('dl') as HTMLElement;
    const cls = dl.className.split(/\s+/).filter(Boolean);
    expect(cls).toContain('mt-2');
    expect(cls.filter((c) => c !== 'mt-2').some((c) => /^-?m[trblxy]?-/.test(c))).toBe(false);
  });
});
