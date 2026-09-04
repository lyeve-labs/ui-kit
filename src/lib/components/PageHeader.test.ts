import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    expect(container.querySelector('h1')?.textContent).toBe('Dashboard');
  });

  it('renders the description', () => {
    const { getByText } = render(PageHeader, {
      props: { title: 'Dashboard', description: 'Your overview' },
    });
    expect(getByText('Your overview')).toBeTruthy();
  });

  it('renders an actions snippet', () => {
    const { getByText } = render(PageHeader, {
      props: { title: 'Dashboard', actions: text('New') },
    });
    expect(getByText('New')).toBeTruthy();
  });

  it('carries no margin of its own', () => {
    // mb-8 was appended ahead of the consumer's class, so a page asking for a
    // different gap shipped two margin utilities in one attribute and the
    // winner was whichever Tailwind emitted last. The shell owns the gap.
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    expect((container.querySelector('header') as HTMLElement).className).not.toMatch(/\bmb-/);
  });

  it('leaves a consumer margin uncontested', () => {
    const { container } = render(PageHeader, {
      props: { title: 'Dashboard', class: 'mb-2' },
    });
    const margins = (container.querySelector('header') as HTMLElement).className.match(/\bmb-\S+/g);
    expect(margins).toEqual(['mb-2']);
  });

  it('renders a compact title and drops the description', () => {
    // A full-height page spends every pixel it does not give away, so the
    // title row shrinks to one line and the description does not render.
    const { container, queryByText } = render(PageHeader, {
      props: { title: 'Canvas', description: 'Your overview', compact: true },
    });
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(h1.textContent).toBe('Canvas');
    expect(h1.className).toContain('text-sm');
    expect(h1.className).not.toContain('text-2xl');
    expect(queryByText('Your overview')).toBeNull();
  });
});
