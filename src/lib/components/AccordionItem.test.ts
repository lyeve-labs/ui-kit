import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import AccordionItem from './AccordionItem.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

// The name an item shares with its siblings comes from the "accordion" context
// its parent provides. It is stubbed here to test the item alone.
const ctx = (name: string | undefined) => new Map([['accordion', { name }]]);

describe('AccordionItem', () => {
  it('is a disclosure the browser opens, titled in plain text with no heading in its summary', () => {
    const { container } = render(AccordionItem, {
      props: { id: 'a', title: 'Section A', children: text('body') },
      context: ctx('faq'),
    });
    const summary = container.querySelector('details > summary')!;
    expect(summary.textContent?.trim()).toBe('Section A');
    expect(summary.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('keeps its shut body in the page, where the server render and find in page reach it', () => {
    const { container, getByText } = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('hidden body') },
      context: ctx('faq'),
    });
    expect(container.querySelector('details')!.open).toBe(false);
    expect(getByText('hidden body')).toBeTruthy();
  });

  it('takes the name its accordion gives it, and none without one', () => {
    const named = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('x') },
      context: ctx('faq'),
    });
    expect(named.container.querySelector('details')!.getAttribute('name')).toBe('faq');
    const alone = render(AccordionItem, { props: { id: 'b', title: 'B', children: text('x') } });
    expect(alone.container.querySelector('details')!.hasAttribute('name')).toBe(false);
  });

  it('carries its id, so a link can point at it', () => {
    const { container } = render(AccordionItem, {
      props: { id: 'refunds', title: 'A', children: text('x') },
      context: ctx(undefined),
    });
    expect(container.querySelector('details')!.id).toBe('refunds');
  });
});
