import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Table from './Table.svelte';

const body = createRawSnippet(() => ({
  render: () => '<tbody><tr><td>Cell</td></tr></tbody>',
}));

/** The focusable box, which is now inside the frame the border is drawn on. */
const scroller = (root: ParentNode) =>
  root.querySelector('[data-testid="table-scroll"]') as HTMLElement;

/**
 * jsdom lays nothing out, so every scroll metric it reports is 0 and no table
 * ever overflows. These are the three numbers the component reads.
 */
function layOut(el: HTMLElement, scrollWidth: number, clientWidth: number, scrollLeft: number) {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
}

const edges = (root: ParentNode) => ({
  before: root.querySelector('[data-testid="table-more-before"]') !== null,
  after: root.querySelector('[data-testid="table-more-after"]') !== null,
});

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

  it('clips the rows to its rounded frame', () => {
    // The hovered row's ring is square and the frame is not; on the last row
    // the corners drew past the frame.
    const { getByTestId } = render(Table, { props: { children: body } });
    const frame = getByTestId('table-frame');
    expect(frame.className).toContain('overflow-hidden');
    expect(frame.className).toContain('rounded-xl');
  });

  it('puts the scroll box in the tab sequence', () => {
    // A wide table scrolls sideways and holds nothing focusable, so without
    // this a keyboard alone cannot reach the columns past the right edge.
    const { container } = render(Table, { props: { children: body } });
    expect(scroller(container).getAttribute('tabindex')).toBe('0');
  });

  it('takes no region role while it has no name', () => {
    // A region is a landmark, and an unnamed one is announced as "region" with
    // nothing after it. The tab stop is what SC 2.1.1 needs; the role is what
    // a name earns.
    const { container } = render(Table, { props: { children: body } });
    expect(scroller(container).getAttribute('role')).toBeNull();
  });

  it('names the scroll region when label is given', () => {
    const { container } = render(Table, { props: { children: body, label: 'Tenants' } });
    const box = scroller(container);
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

  it('advertises nothing while the table fits', async () => {
    // The affordance is a property of this table, not decoration every table
    // wears. A fade on a table with nothing behind its edge is a lie about
    // where the content ends.
    const { container } = render(Table, { props: { children: body } });
    const box = scroller(container);
    layOut(box, 400, 400, 0);
    await fireEvent.scroll(box);
    expect(edges(container)).toEqual({ before: false, after: false });
  });

  it('marks only the edge the content continues past', async () => {
    // Reachable was not discoverable. The scroll box became a tab stop and
    // still nothing on screen said the columns existed: a phone paints its
    // scrollbar while a finger is moving and hides it the rest of the time,
    // and the column that falls off the edge of the admin's plugin list at
    // 390px is the one holding the only action on the page.
    const { container } = render(Table, { props: { children: body } });
    const box = scroller(container);

    layOut(box, 900, 400, 0);
    await fireEvent.scroll(box);
    expect(edges(container)).toEqual({ before: false, after: true });

    box.scrollLeft = 250;
    await fireEvent.scroll(box);
    expect(edges(container)).toEqual({ before: true, after: true });

    box.scrollLeft = 500;
    await fireEvent.scroll(box);
    expect(edges(container)).toEqual({ before: true, after: false });
  });

  it('reads a right-to-left box, where the offset runs negative', async () => {
    // A right-to-left scroll box reports its position as a negative number.
    // Compared as written it is never greater than zero, so the start edge
    // would never be marked and the end edge would be marked from the first
    // pixel and never clear.
    const { container } = render(Table, { props: { children: body } });
    const box = scroller(container);
    layOut(box, 900, 400, -250);
    await fireEvent.scroll(box);
    expect(edges(container)).toEqual({ before: true, after: true });
  });

  it('treats the last fraction of a pixel as the end', async () => {
    // Sub-pixel layout leaves scrollLeft short of its own maximum at the far
    // end, so an exact comparison reports more content behind an edge that has
    // none and the fade never clears.
    const { container } = render(Table, { props: { children: body } });
    const box = scroller(container);
    layOut(box, 900.4, 400, 500.1);
    await fireEvent.scroll(box);
    expect(edges(container).after).toBe(false);
  });

  it('keeps the affordance out of the accessibility tree', async () => {
    // The region already announces itself and the columns are in the table
    // either way. This is a picture of a scrollbar.
    const { container } = render(Table, { props: { children: body } });
    const box = scroller(container);
    layOut(box, 900, 400, 0);
    await fireEvent.scroll(box);
    const edge = container.querySelector('[data-testid="table-more-after"]') as HTMLElement;
    expect(edge.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives up its clipping on paper', () => {
    // overflow-x-auto is what hides the columns, and paper has no viewport to
    // scroll. The ops console prints its audit log through this component.
    const { container } = render(Table, { props: { children: body } });
    expect(scroller(container).getAttribute('data-print')).toBe('unclip');
  });
});

describe('Table cell fit', () => {
  const wide = createRawSnippet(() => ({
    render: () =>
      '<tbody><tr>' +
      '<td data-testid="plain">a-very-long-unbroken-token-with-no-space-in-it</td>' +
      '<td data-testid="clip" data-cell="truncate">clipped</td>' +
      '<td data-testid="held" data-cell="nowrap">2026-09-08</td>' +
      '</tr></tbody>',
  }));

  const table = (root: ParentNode) => root.querySelector('table') as HTMLElement;

  /*
   * The default is `wrap` and not `auto`. A cell holding one unbroken token has
   * no break opportunity in it, so the auto table algorithm sizes the column to
   * the whole string: one measured container went from no overflow at all to
   * 3,086px of it, and the audit log overran its own by 419px at 390px wide.
   * `overflow-wrap: anywhere` is the one value that shrinks a column's
   * min-content width, and it leaves prose breaking at its spaces as before.
   */
  it('wraps an unbreakable value by default', () => {
    const { container } = render(Table, { props: { children: wide } });
    expect(table(container).className).toContain(
      '[&_tbody_td:not([data-cell])]:[overflow-wrap:anywhere]',
    );
  });

  /*
   * `auto` drops the table-wide treatment and keeps the per-cell one: a caller
   * who wants the browser's own sizing everywhere can still clip one column.
   */
  it('leaves the table algorithm alone when asked for auto', () => {
    const { container } = render(Table, { props: { children: wide, cell: 'auto' } });
    const cls = table(container).className;
    expect(cls).not.toContain('[&_tbody_td:not([data-cell])]');
    expect(cls).toContain('[&_tbody_td[data-cell=truncate]]:truncate');
  });

  it('caps every cell that did not ask for its own treatment when asked to truncate', () => {
    const { container } = render(Table, { props: { children: wide, cell: 'truncate' } });
    const cls = table(container).className;
    expect(cls).toContain('[&_tbody_td:not([data-cell])]:truncate');
    expect(cls).toContain('[&_tbody_td:not([data-cell])]:max-w-[var(--cell-truncate)]');
  });

  /*
   * `:not([data-cell])` is what keeps a column's own choice and the table's
   * default from both matching the same property, where which one won came down
   * to the order Tailwind happened to emit them in.
   */
  it('scopes the table default away from a cell that named its own', () => {
    const { container } = render(Table, { props: { children: wide, cell: 'truncate' } });
    const cls = table(container).className;
    expect(cls).toContain('[&_tbody_td[data-cell=nowrap]]:whitespace-nowrap');
    expect(cls).toContain('[&_tbody_td[data-cell=truncate]]:truncate');
    expect(cls).not.toContain('[&_tbody_td]:truncate');
  });

  it('carries the truncation width as a custom property the caller can set', () => {
    const { container } = render(Table, { props: { children: wide } });
    expect(table(container).getAttribute('style')).toContain('--cell-truncate: 20rem');
    const other = render(Table, { props: { children: wide, truncateAt: '8rem' } });
    expect(table(other.container).getAttribute('style')).toContain('--cell-truncate: 8rem');
  });

  it('aligns on the reading axis rather than the left', () => {
    const { container } = render(Table, { props: { children: wide } });
    expect(table(container).className).toContain('text-start');
    expect(table(container).className).not.toContain('text-left');
  });
});

describe('Table keeps a clipped value reachable', () => {
  const rows = createRawSnippet(() => ({
    render: () =>
      '<tbody><tr>' +
      '<td data-testid="clip" data-cell="truncate">a value too wide for its column</td>' +
      '<td data-testid="own" data-cell="truncate" title="the caller said this">short</td>' +
      '<td data-testid="fits" data-cell="truncate">fits</td>' +
      '<td data-testid="free">not a truncating cell at all</td>' +
      '</tr></tbody>',
  }));

  /** jsdom lays nothing out, so a cell only clips if it is told it does. */
  function clip(el: HTMLElement, scrollWidth: number, clientWidth: number) {
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  }

  const arrive = (el: HTMLElement) => el.dispatchEvent(new Event('pointerover', { bubbles: true }));

  it('hands back the full value when a pointer reaches a clipped cell', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    const cell = getByTestId('clip');
    clip(cell, 400, 120);
    expect(cell.getAttribute('title')).toBe(null);
    arrive(cell);
    expect(cell.getAttribute('title')).toBe('a value too wide for its column');
  });

  it('hands it back to the keyboard too', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    const cell = getByTestId('clip');
    clip(cell, 400, 120);
    cell.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(cell.getAttribute('title')).toBe('a value too wide for its column');
  });

  it('adds nothing to a cell that shows all of itself', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    const cell = getByTestId('fits');
    clip(cell, 100, 100);
    arrive(cell);
    expect(cell.getAttribute('title')).toBe(null);
  });

  it('leaves a title the caller wrote alone', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    const cell = getByTestId('own');
    clip(cell, 400, 120);
    arrive(cell);
    expect(cell.getAttribute('title')).toBe('the caller said this');
  });

  it('takes its own title back once the cell stops clipping', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    const cell = getByTestId('clip');
    clip(cell, 400, 120);
    arrive(cell);
    expect(cell.getAttribute('title')).toBe('a value too wide for its column');
    clip(cell, 120, 120);
    arrive(cell);
    expect(cell.getAttribute('title')).toBe(null);
  });

  it('says nothing about a cell that is not truncating', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    const cell = getByTestId('free');
    clip(cell, 400, 120);
    arrive(cell);
    expect(cell.getAttribute('title')).toBe(null);
  });

  /*
   * The measurement is what a tenant with 10,000 rows pays for, so it happens
   * where the pointer is and nowhere else. Rendering must touch no cell.
   */
  it('measures nothing until something arrives at a cell', () => {
    const { getByTestId } = render(Table, { props: { children: rows } });
    for (const id of ['clip', 'own', 'fits', 'free']) {
      expect(getByTestId(id).hasAttribute('data-cell-title')).toBe(false);
    }
  });
});
