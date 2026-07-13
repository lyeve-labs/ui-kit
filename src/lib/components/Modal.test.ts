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
});
