import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Drawer from './Drawer.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

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
    expect(panel.className).toContain('w-80');
    expect(panel.className).toContain('border-l');
  });

  it('anchors to the left when side="left"', () => {
    const { container } = render(Drawer, {
      props: { open: true, side: 'left', children: text('x') },
    });
    expect(container.querySelector('[role="dialog"]')?.className).toContain('border-r');
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
