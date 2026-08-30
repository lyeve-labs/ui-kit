import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import AccordionItem from './AccordionItem.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

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

  it('takes its closed body out of reach without removing it', () => {
    // The body stays in the DOM so the panel can animate to its own height.
    // Closed, it must be collapsed to nothing and inert - a screen reader and
    // the tab order have to agree with what the eye sees.
    const { container, getByText } = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('hidden body') },
      context: ctx(false),
    });
    expect(container.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
    const panel = container.querySelector('[role="region"]');
    expect(panel).not.toBeNull();
    // Svelte sets inert as a DOM property; it is the property, not a reflected
    // attribute, that takes the subtree out of the tab order.
    expect((panel as HTMLElement).inert).toBe(true);
    expect(getByText('hidden body')).toBeTruthy();
    expect(container.querySelector('.grid')?.className).toContain('grid-rows-[0fr]');
  });

  it('opens its body to the height of its own content', () => {
    const { container } = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('shown body') },
      context: ctx(true),
    });
    const panel = container.querySelector('[role="region"]');
    expect((panel as HTMLElement).inert).toBe(false);
    expect(container.querySelector('.grid')?.className).toContain('grid-rows-[1fr]');
  });

  it('names its panel from its header', () => {
    const { container } = render(AccordionItem, {
      props: { id: 'a', title: 'A', children: text('body') },
      context: ctx(true),
    });
    const btn = container.querySelector('button');
    const panel = container.querySelector('[role="region"]');
    expect(btn?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.getAttribute('aria-labelledby')).toBe(btn?.id);
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
