import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import AccordionItem from './AccordionItem.svelte';

const text = (s: string) =>
  createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

// AccordionItem reads its open/toggle behaviour from the "accordion" context that
// its parent <Accordion> provides. We stub that context to test it in isolation.
function ctx(open: boolean, toggle = vi.fn()) {
  return new Map([['accordion', { isOpen: () => open, toggle, flush: false }]]);
}

describe('AccordionItem', () => {
  it('renders the header title', () => {
    const { getByText } = render(AccordionItem, {
      props: { id: 'a', title: 'Section A', children: text('body') },
      context: ctx(false),
    });
    expect(getByText('Section A')).toBeTruthy();
  });

  it('hides its body when the context reports it closed', () => {
    const { container, queryByText } = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('hidden body') },
      context: ctx(false),
    });
    expect(container.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
    expect(queryByText('hidden body')).toBeNull();
  });

  it('shows its body when the context reports it open', () => {
    const { container, getByText } = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('visible body') },
      context: ctx(true),
    });
    expect(container.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    expect(getByText('visible body')).toBeTruthy();
  });

  it('calls the context toggle with its id when the header is clicked', async () => {
    const toggle = vi.fn();
    const { container } = render(AccordionItem, {
      props: { id: 'sec-1', title: 'A', children: text('x') },
      context: ctx(false, toggle),
    });
    await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(toggle).toHaveBeenCalledWith('sec-1');
  });
});
