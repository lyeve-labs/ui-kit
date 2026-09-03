import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(Modal, { props: { open: false, children: text('body') } });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders a dialog with title and children when open', () => {
    const { container, getByText } = render(Modal, {
      props: { open: true, title: 'Confirm', children: text('Are you sure?') },
    });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe('Confirm');
    expect(getByText('Are you sure?')).toBeTruthy();
  });

  it('applies the size width class', () => {
    const { container } = render(Modal, {
      props: { open: true, size: 'lg', children: text('x') },
    });
    expect(container.querySelector('[role="dialog"]')?.className).toContain('max-w-2xl');
  });

  it('renders a footer snippet', () => {
    const { getByText } = render(Modal, {
      props: { open: true, children: text('body'), footer: text('Save') },
    });
    expect(getByText('Save')).toBeTruthy();
  });

  it('fires onclose when a close control is clicked', async () => {
    const onclose = vi.fn();
    const { container } = render(Modal, {
      props: { open: true, title: 'T', children: text('x'), onclose },
    });
    const closeBtn = container.querySelectorAll('[aria-label="Close"]')[0] as HTMLButtonElement;
    await fireEvent.click(closeBtn);
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('moves focus into the panel and restores it to the opener on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { container, unmount } = render(Modal, {
      props: { open: true, title: 'Confirm', children: text('body') },
    });

    const panel = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(panel.contains(document.activeElement)).toBe(true);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('keeps Tab inside the panel', async () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Confirm', children: text('body') },
    });
    const panel = container.querySelector('[role="dialog"]') as HTMLElement;
    const stops = [...panel.querySelectorAll('button')];
    expect(stops.length).toBeGreaterThan(0);

    stops[stops.length - 1].focus();
    await fireEvent.keyDown(panel, { key: 'Tab' });
    expect(document.activeElement).toBe(stops[0]);

    await fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it('names itself by its own heading', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Delete tenant', children: text('body') },
    });
    const panel = container.querySelector('[role="dialog"]') as HTMLElement;
    const id = panel.getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    expect(container.querySelector(`#${id}`)?.textContent).toBe('Delete tenant');
  });

  it('leaves the backdrop out of the tab order', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Confirm', children: text('body') },
    });
    const backdrop = container.querySelector('button[aria-hidden="true"]') as HTMLElement;
    expect(backdrop.getAttribute('tabindex')).toBe('-1');
  });

  it('gives the body its own scroll rather than overflowing the viewport', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Confirm', children: text('body') },
    });
    const panel = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(panel.className).toContain('max-h-');
    expect(panel.querySelector('.overflow-y-auto')).toBeTruthy();
  });
});
