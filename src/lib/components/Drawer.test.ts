import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet, tick, type ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { OVERLAY_WIDTH } from '../internal/layout.js';
import Drawer from './Drawer.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/** A body holding `n` labeled fields, the way a form snippet renders one. */
const form = (n: number) =>
  createRawSnippet(() => ({
    render: () => `<div>${'<div data-field><input /></div>'.repeat(n)}</div>`,
  }));

const panelOf = (container: Element) => container.querySelector('[role="dialog"]') as HTMLElement;

/** Renders an open drawer and lets the fit effect measure its body. */
async function open(props: ComponentProps<typeof Drawer>) {
  const { container } = render(Drawer, { props: { ...props, open: true } });
  await tick();
  return panelOf(container);
}

describe('Drawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(Drawer, { props: { open: false, children: text('body') } });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders a dialog with title and children when open', () => {
    const { container, getByText } = render(Drawer, {
      props: { open: true, title: 'Filters', children: text('panel body') },
    });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe('Filters');
    expect(getByText('panel body')).toBeTruthy();
  });

  it('anchors to the right by default with the md width', () => {
    const { container } = render(Drawer, { props: { open: true, children: text('x') } });
    const panel = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(panel.className).toContain(OVERLAY_WIDTH.md);
    /*
     * Split into class names rather than searched as a substring. The rule is
     * drawn on the panel's inner edge, and the old `toContain('border-l')` was
     * satisfied by the `border-line` sitting beside it, so the assertion held
     * whichever edge the border was actually on.
     */
    expect(panel.className.split(/\s+/)).toContain('border-s');
  });

  it('anchors to the left when side="left"', () => {
    const { container } = render(Drawer, {
      props: { open: true, side: 'left', children: text('x') },
    });
    const panel = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(panel.className.split(/\s+/)).toContain('border-e');
  });

  it.each([
    [0, 'md'],
    [4, 'md'],
    [5, 'lg'],
    [8, 'lg'],
    [9, 'xl'],
  ] as const)('takes the rung %i fields earn', async (fields, rung) => {
    const panel = await open({ children: form(fields) });
    expect(panel.className).toContain(OVERLAY_WIDTH[rung]);
  });

  it('counts a group of options as one field', async () => {
    // Every option marks itself too, so the outermost marker is the only one
    // that may count: a five-option radio group is one question, not six.
    const group = createRawSnippet(() => ({
      render: () =>
        `<div><fieldset data-field>${'<div data-field><input type="radio" /></div>'.repeat(5)}</fieldset></div>`,
    }));
    const panel = await open({ children: group });
    expect(panel.className).toContain(OVERLAY_WIDTH.md);
  });

  it('keeps the size its caller asked for', async () => {
    const panel = await open({ size: 'sm', children: form(12) });
    expect(panel.className).toContain(OVERLAY_WIDTH.sm);
  });

  it('follows a body that grows while it is open', async () => {
    // A period set to custom reveals two date fields; a section behind a
    // toggle appears whole. A measurement taken once at mount would size the
    // panel for a form the reader is no longer filling in.
    const { container } = render(Drawer, { props: { open: true, children: form(3) } });
    await tick();
    expect(panelOf(container).className).toContain(OVERLAY_WIDTH.md);

    const body = panelOf(container).querySelector('[data-field]')!.parentElement!;
    for (let i = 0; i < 4; i += 1) {
      const field = document.createElement('div');
      field.setAttribute('data-field', '');
      body.append(field);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panelOf(container).className).toContain(OVERLAY_WIDTH.lg);
  });

  it('never exceeds the window on a narrow screen', () => {
    // The cap is a maximum and the panel is `w-full` under it, so a 448px
    // rung on a 360px phone is the width of the phone.
    const { container } = render(Drawer, { props: { open: true, children: form(12) } });
    expect(panelOf(container).className.split(/\s+/)).toContain('w-full');
  });

  it('fires onclose when a close control is clicked', async () => {
    const onclose = vi.fn();
    const { container } = render(Drawer, {
      props: { open: true, title: 'T', children: text('x'), onclose },
    });
    const closeBtn = container.querySelectorAll('[aria-label="Close"]')[0] as HTMLButtonElement;
    await fireEvent.click(closeBtn);
    expect(onclose).toHaveBeenCalledOnce();
  });
});
