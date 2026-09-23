import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Alert from './Alert.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/** The root carries one of the two live-region roles, never neither. */
const root = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[role="alert"], [role="status"]');

describe('Alert', () => {
  it('renders children', () => {
    const { container, getByText } = render(Alert, { props: { children: text('Heads up') } });
    expect(getByText('Heads up')).toBeTruthy();
    expect(root(container)).toBeTruthy();
  });

  it('renders the title', () => {
    const { getByText } = render(Alert, {
      props: { children: text('body'), title: 'Notice' },
    });
    expect(getByText('Notice')).toBeTruthy();
  });

  it('applies the tone wrapper class and glyph for danger', () => {
    const { container } = render(Alert, {
      props: { children: text('x'), tone: 'danger' },
    });
    expect(root(container)?.className).toContain('bg-danger/8');
    expect(container.querySelector('svg path')?.getAttribute('d')).toBe('M18 6L6 18M6 6l12 12');
  });

  it('defaults to the brand tone', () => {
    const { container } = render(Alert, { props: { children: text('x') } });
    expect(root(container)?.className).toContain('bg-brand/8');
  });

  it('still accepts the retained "info" spelling of the brand tone', () => {
    const { container } = render(Alert, { props: { children: text('x'), tone: 'info' } });
    expect(root(container)?.className).toContain('bg-brand/8');
  });

  it('carries a neutral tone, matching Banner', () => {
    const { container } = render(Alert, { props: { children: text('x'), tone: 'neutral' } });
    expect(root(container)?.className).toContain('bg-surface-2');
  });

  it('fires ondismiss when the dismiss button is clicked', async () => {
    const ondismiss = vi.fn();
    const { getByLabelText } = render(Alert, {
      props: { children: text('x'), dismissible: true, ondismiss },
    });
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('removes itself when dismissed, without the page doing anything', async () => {
    const { container, getByLabelText } = render(Alert, {
      props: { children: text('x'), dismissible: true },
    });
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(root(container)).toBeNull();
  });

  it('has no dismiss button unless dismissible', () => {
    const { queryByLabelText } = render(Alert, { props: { children: text('x') } });
    expect(queryByLabelText('Dismiss')).toBeNull();
  });

  describe('which live region it is', () => {
    // A failure and a warning interrupt. Anything else waits for a pause.
    it.each([
      ['danger', 'alert', 'assertive'],
      ['warn', 'alert', 'assertive'],
      ['success', 'status', 'polite'],
      ['brand', 'status', 'polite'],
      ['neutral', 'status', 'polite'],
    ] as const)('%s takes role=%s', (tone, role, live) => {
      const { container } = render(Alert, { props: { children: text('x'), tone } });
      expect(container.querySelector(`[role="${role}"]`)).toBeTruthy();
      expect(root(container)?.getAttribute('aria-live')).toBe(live);
    });
  });

  describe('a confirmation that clears itself', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('stays put by default', async () => {
      const { container } = render(Alert, { props: { children: text('x'), tone: 'success' } });
      await vi.advanceTimersByTimeAsync(60_000);
      expect(root(container)).toBeTruthy();
    });

    it('closes itself after the default delay when autoDismiss is set', async () => {
      const { container } = render(Alert, {
        props: { children: text('x'), tone: 'success', autoDismiss: true },
      });
      await vi.advanceTimersByTimeAsync(4_900);
      expect(root(container)).toBeTruthy();
      await vi.advanceTimersByTimeAsync(200);
      expect(root(container)).toBeNull();
    });

    it('takes an explicit delay in milliseconds', async () => {
      const { container } = render(Alert, {
        props: { children: text('x'), autoDismiss: 1_000 },
      });
      await vi.advanceTimersByTimeAsync(1_100);
      expect(root(container)).toBeNull();
    });

    it('calls ondismiss when the timer closes it', async () => {
      const ondismiss = vi.fn();
      render(Alert, { props: { children: text('x'), autoDismiss: 1_000, ondismiss } });
      await vi.advanceTimersByTimeAsync(1_100);
      expect(ondismiss).toHaveBeenCalledOnce();
    });

    it('offers a dismiss button, so the reader need not wait', () => {
      const { getByLabelText } = render(Alert, {
        props: { children: text('x'), autoDismiss: true },
      });
      expect(getByLabelText('Dismiss')).toBeTruthy();
    });

    // Text is never pulled away from somebody reading it.
    it('holds while the pointer is over it', async () => {
      const { container } = render(Alert, {
        props: { children: text('x'), autoDismiss: 1_000 },
      });
      await fireEvent.mouseEnter(root(container)!);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(root(container)).toBeTruthy();

      await fireEvent.mouseLeave(root(container)!);
      await vi.advanceTimersByTimeAsync(1_100);
      expect(root(container)).toBeNull();
    });

    it('holds while focus is inside it', async () => {
      const { container } = render(Alert, {
        props: { children: text('x'), autoDismiss: 1_000 },
      });
      await fireEvent.focusIn(root(container)!);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(root(container)).toBeTruthy();
    });
  });
});
