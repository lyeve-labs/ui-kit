import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Collapsible from './Collapsible.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const body = () =>
  createRawSnippet(() => ({ render: () => '<button type="button">Reset cache</button>' }));

describe('Collapsible', () => {
  it('renders its label on a real button that says what it controls', () => {
    const { container } = render(Collapsible, {
      props: { label: 'Advanced options', children: text('body') },
    });
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent).toContain('Advanced options');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    const region = container.querySelector('[role="region"]') as HTMLElement;
    expect(trigger.getAttribute('aria-controls')).toBe(region.id);
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('gives its trigger and its region ids that survive hydration', () => {
    // $props.id() and not Math.random(): a random id differs between the server
    // render and the client, so aria-controls points at nothing on first paint.
    const a = render(Collapsible, { props: { label: 'A', children: text('x') } });
    const b = render(Collapsible, { props: { label: 'B', children: text('x') } });
    const idOf = (r: typeof a) => (r.container.querySelector('[role="region"]') as HTMLElement).id;
    expect(idOf(a)).toBeTruthy();
    expect(idOf(a)).not.toBe(idOf(b));
    expect(idOf(a)).not.toMatch(/\d\.\d/);
  });

  it('takes a collapsed region out of the tab order, not merely to zero height', () => {
    // The trap this component exists to avoid. Content hidden with a height
    // animation stays mounted so the row can animate to its own height, and a
    // subtree that is only zero pixels tall is still in the accessibility tree
    // and still focusable: Tab lands on a control the reader cannot see. inert
    // is the only thing that takes the subtree out of both.
    const { container, getByText } = render(Collapsible, {
      props: { label: 'Advanced options', children: body() },
    });
    const region = container.querySelector('[role="region"]') as HTMLElement;

    expect(container.querySelector('.grid')?.className).toContain('grid-rows-[0fr]');
    expect(getByText('Reset cache')).toBeTruthy();
    // Svelte sets inert as a DOM property. jsdom reflects the property and does
    // not enforce it, so the property is what this asserts; in a browser it is
    // the property that removes the subtree from the tab order.
    expect(region.inert).toBe(true);
  });

  it('returns the region to the tab order when it opens', async () => {
    const { container } = render(Collapsible, {
      props: { label: 'Advanced options', children: body() },
    });
    const trigger = container.querySelector('button') as HTMLButtonElement;
    await fireEvent.click(trigger);

    const region = container.querySelector('[role="region"]') as HTMLElement;
    expect(region.inert).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.grid')?.className).toContain('grid-rows-[1fr]');
  });

  it('opens from the prop as well as from the trigger', () => {
    const { container } = render(Collapsible, {
      props: { open: true, label: 'Log', children: text('a long line') },
    });
    expect(container.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    expect((container.querySelector('[role="region"]') as HTMLElement).inert).toBe(false);
  });

  it('follows the prop when the page opens it from outside', async () => {
    // The reason this is not a details element: a page that opens the block
    // from a deep link or a search hit has no way into the native one.
    const { container, rerender } = render(Collapsible, {
      props: { open: false, label: 'Log', children: text('a long line') },
    });
    await rerender({ open: true, label: 'Log', children: text('a long line') });
    expect(container.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    expect((container.querySelector('[role="region"]') as HTMLElement).inert).toBe(false);
  });

  it('closes again on a second press', async () => {
    const { container } = render(Collapsible, {
      props: { open: true, label: 'Log', children: text('x') },
    });
    const trigger = container.querySelector('button') as HTMLButtonElement;
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect((container.querySelector('[role="region"]') as HTMLElement).inert).toBe(true);
  });

  it('does not toggle while it is disabled', async () => {
    const { container } = render(Collapsible, {
      props: { label: 'Advanced options', disabled: true, children: text('x') },
    });
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('drops the hover background while it is disabled', () => {
    // :hover still matches a disabled button, so a hover tint left in place
    // reads as a control that will answer a press.
    const on = render(Collapsible, { props: { label: 'A', children: text('x') } });
    expect(on.container.querySelector('button')?.className).toContain('hover:bg-surface-2');
    const off = render(Collapsible, {
      props: { label: 'A', disabled: true, children: text('x') },
    });
    expect(off.container.querySelector('button')?.className).not.toContain('hover:bg-surface-2');
  });

  it('renders a badge beside the label', () => {
    const { container } = render(Collapsible, {
      props: { label: 'Filters', badge: 3, children: text('x') },
    });
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Filters');
    expect(trigger.textContent).toContain('3');
  });

  it('renders a badge of 0, which is a count and not an absent one', () => {
    const { container } = render(Collapsible, {
      props: { label: 'Filters', badge: 0, children: text('x') },
    });
    expect(container.querySelector('button')?.textContent).toContain('0');
  });

  it('draws its chevron as a stroked path, never as a text glyph', () => {
    const { container } = render(Collapsible, {
      props: { label: 'A', children: text('x') },
    });
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M6 9l6 6 6-6');
    expect(svg.getAttribute('class')).toContain('-rotate-90');
  });

  it('turns the chevron down when it is open', () => {
    const { container } = render(Collapsible, {
      props: { open: true, label: 'A', children: text('x') },
    });
    expect(container.querySelector('svg')?.getAttribute('class')).not.toContain('-rotate-90');
  });

  it('takes a class from the consumer', () => {
    const { container } = render(Collapsible, {
      props: { label: 'A', class: 'mt-4', children: text('x') },
    });
    expect((container.firstElementChild as HTMLElement).className).toContain('mt-4');
  });
});
