import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Table from './Table.svelte';

const body = createRawSnippet(() => ({
  render: () => '<tbody><tr><td>Cell</td></tr></tbody>',
}));

describe('Table', () => {
  it('renders its children inside a table', () => {
    const { container, getByText } = render(Table, { props: { children: body } });
    expect(container.querySelector('table')).toBeTruthy();
    expect(getByText('Cell')).toBeTruthy();
  });

  it('adds the fixed layout class when fixed=true', () => {
    const { container } = render(Table, { props: { children: body, fixed: true } });
    expect(container.querySelector('table')?.className).toContain('table-fixed');
  });

  it('adds striped-row styling when striped=true', () => {
    const { container } = render(Table, { props: { children: body, striped: true } });
    expect(container.querySelector('table')?.className).toContain('nth-child(even)');
  });

  it('is hoverable by default', () => {
    const { container } = render(Table, { props: { children: body } });
    expect(container.querySelector('table')?.className).toContain('tr:hover');
  });

  it('puts the scroll box in the tab sequence', () => {
    // A wide table scrolls sideways and holds nothing focusable, so without
    // this a keyboard alone cannot reach the columns past the right edge.
    const { container } = render(Table, { props: { children: body } });
    expect(container.firstElementChild?.getAttribute('tabindex')).toBe('0');
  });

  it('takes no region role while it has no name', () => {
    // A region is a landmark, and an unnamed one is announced as "region" with
    // nothing after it. The tab stop is what SC 2.1.1 needs; the role is what
    // a name earns.
    const { container } = render(Table, { props: { children: body } });
    expect(container.firstElementChild?.getAttribute('role')).toBeNull();
  });

  it('names the scroll region when label is given', () => {
    const { container } = render(Table, { props: { children: body, label: 'Tenants' } });
    const box = container.firstElementChild as HTMLElement;
    expect(box.getAttribute('role')).toBe('region');
    expect(box.getAttribute('aria-label')).toBe('Tenants');
    expect(box.getAttribute('tabindex')).toBe('0');
  });

  it('marks the hovered row with a ring and not with a tint alone', () => {
    // The hover tint reads 1.017:1 against a striped row on the dark palette,
    // which is not a state anyone can see. The panels answer this with a brand
    // ring; the table uses the same one.
    const { container } = render(Table, { props: { children: body } });
    const cls = container.querySelector('table')?.className ?? '';
    expect(cls).toContain('[&_tbody_tr:hover]:ring-1');
    expect(cls).toContain('[&_tbody_tr:hover]:ring-inset');
    expect(cls).toContain('[&_tbody_tr:hover]:ring-brand');
  });

  it('separates its borders so the hover ring is painted at all', () => {
    // No browser paints a box-shadow on a table row while the table collapses
    // its borders, so the ring above depends on this and on the separators
    // sitting on the cells.
    const { container } = render(Table, { props: { children: body } });
    const cls = container.querySelector('table')?.className ?? '';
    expect(cls).toContain('border-separate');
    expect(cls).toContain('border-spacing-0');
    expect(cls).toContain('[&_tbody_td]:border-b');
    expect(cls).not.toContain('[&_tbody_tr]:border-b');
  });

  it('drops the hover ring when hoverable=false', () => {
    const { container } = render(Table, { props: { children: body, hoverable: false } });
    expect(container.querySelector('table')?.className).not.toContain('ring-brand');
  });
});
