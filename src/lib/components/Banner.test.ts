import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Banner from './Banner.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Banner', () => {
  it('renders children with role="status"', () => {
    const { container, getByText } = render(Banner, {
      props: { children: text('Maintenance tonight') },
    });
    expect(getByText('Maintenance tonight')).toBeTruthy();
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('applies the tone class', () => {
    const { container } = render(Banner, {
      props: { children: text('x'), tone: 'success' },
    });
    expect(container.querySelector('[role="status"]')?.className).toContain('bg-success/10');
  });

  it('renders an action snippet', () => {
    const { getByText } = render(Banner, {
      props: { children: text('x'), action: text('Undo') },
    });
    expect(getByText('Undo')).toBeTruthy();
  });

  it('dismisses (unmounts) and fires ondismiss when clicked', async () => {
    const ondismiss = vi.fn();
    const { container, getByLabelText } = render(Banner, {
      props: { children: text('x'), dismissible: true, ondismiss },
    });
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(ondismiss).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

describe('a confirmation that clears itself', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays put by default', async () => {
    const { container } = render(Banner, { props: { children: text('x'), tone: 'success' } });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('closes itself after the default delay, the same one Alert waits', async () => {
    const { container } = render(Banner, {
      props: { children: text('x'), tone: 'success', autoDismiss: true },
    });
    await vi.advanceTimersByTimeAsync(4_900);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(200);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('offers a dismiss button, so the reader need not wait', () => {
    const { getByLabelText } = render(Banner, {
      props: { children: text('x'), autoDismiss: true },
    });
    expect(getByLabelText('Dismiss')).toBeTruthy();
  });

  it('holds while the pointer is over it', async () => {
    const { container } = render(Banner, {
      props: { children: text('x'), autoDismiss: 1_000 },
    });
    await fireEvent.mouseEnter(container.querySelector('[role="status"]')!);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });
});
