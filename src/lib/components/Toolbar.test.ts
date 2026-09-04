import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Toolbar from './Toolbar.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe('Toolbar', () => {
  it('carries role toolbar', () => {
    const { container, getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    expect(getByRole('toolbar')).toBe(rootOf(container));
  });

  it('carries its accessible name', () => {
    // Two toolbars on one page are announced identically without it, so a
    // screen reader user cannot tell the table filters from the bulk actions.
    const { getByRole } = render(Toolbar, {
      props: { label: 'Content filters', children: text('Filters') },
    });
    const toolbar = getByRole('toolbar', { name: 'Content filters' });
    expect(toolbar.getAttribute('aria-label')).toBe('Content filters');
  });

  it('omits aria-label when it has no name to give', () => {
    // An empty aria-label is announced as an unnamed toolbar and hides
    // whatever a container above it had already named.
    const { getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    expect(getByRole('toolbar').hasAttribute('aria-label')).toBe(false);
  });

  it('aligns its controls on their vertical centres', () => {
    // The defect it replaces: hand-rolled filter rows stretched or top-aligned
    // their children, so a search box, a select and a button sat off by a
    // couple of pixels from each other.
    const { getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    const cls = getByRole('toolbar').className;
    expect(cls).toContain('items-center');
    expect(cls).not.toContain('items-start');
    expect(cls).not.toContain('items-stretch');
  });

  it('wraps on a narrow viewport rather than overflowing', () => {
    // A row that overflows takes a horizontal scrollbar the user has to find
    // before the last filter can be reached.
    const { getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    const cls = getByRole('toolbar').className;
    expect(cls).toContain('flex-wrap');
    expect(cls).not.toContain('overflow-x-auto');
    expect(cls).not.toContain('flex-nowrap');
  });

  it('makes its children flex items of the row itself', () => {
    // A wrapper would align its own contents and leave the toolbar aligning
    // one box, which is how a filter row loses the alignment it exists for.
    const { getByRole, getByText } = render(Toolbar, { props: { children: text('Search') } });
    expect(getByText('Search').parentElement).toBe(getByRole('toolbar'));
  });

  it('pushes the actions to the trailing edge', () => {
    const { getByRole, getByText } = render(Toolbar, {
      props: { children: text('Search'), actions: text('Export') },
    });
    const group = getByText('Export').parentElement as HTMLElement;
    expect(group.className).toContain('ms-auto');
    expect(group.parentElement).toBe(getByRole('toolbar'));
    const search = getByText('Search');
    expect(search.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('renders no actions group when there are no actions', () => {
    const { getByRole } = render(Toolbar, { props: { children: text('Search') } });
    expect(getByRole('toolbar').children).toHaveLength(1);
  });

  it('accepts a consumer class without competing with a built-in utility', () => {
    // A margin is safe here because the toolbar states none; two utilities for
    // one property resolve by the order Tailwind emits them.
    const { getByRole } = render(Toolbar, {
      props: { class: 'mb-4', children: text('Filters') },
    });
    const cls = getByRole('toolbar').className.split(/\s+/).filter(Boolean);
    expect(cls).toContain('mb-4');
    expect(cls.filter((c) => c !== 'mb-4').some((c) => /^-?m[trblxy]?-/.test(c))).toBe(false);
  });
});
