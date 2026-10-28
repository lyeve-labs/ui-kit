import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Alert from './Alert.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/** The alert's own box, a live region or not. */
const root = (container: HTMLElement) => container.firstElementChild as HTMLElement | null;

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
    // A failure and a warning interrupt. Anything else states a standing
    // condition and is no live region, so a page that shows it reads nothing
    // out. An alert that clears itself is the polite case below.
    it.each([
      ['danger', 'alert', 'assertive'],
      ['warn', 'alert', 'assertive'],
      ['success', null, null],
      ['brand', null, null],
      ['neutral', null, null],
    ] as const)('%s takes role %s and aria-live %s', (tone, role, live) => {
      const { container } = render(Alert, { props: { children: text('x'), tone } });
      expect(root(container)?.getAttribute('role')).toBe(role);
      expect(root(container)?.getAttribute('aria-live')).toBe(live);
      expect(root(container)?.tagName).toBe('DIV');
    });

    it('waits, whatever its tone, when it clears itself', () => {
      // Interrupting to say something and then taking it away leaves the
      // reader nothing to act on.
      for (const tone of ['danger', 'warn', 'success', 'brand', 'neutral'] as const) {
        for (const autoDismiss of [true, 3000]) {
          const { container, unmount } = render(Alert, {
            props: { children: text('x'), tone, autoDismiss },
          });
          // Browsers expose role="status" as a status bar, and Orca speaks
          // nothing inserted into one.
          expect(root(container)?.hasAttribute('role'), tone).toBe(false);
          expect(root(container)?.getAttribute('aria-live'), tone).toBe('polite');
          unmount();
        }
      }
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

describe('an outcome is announced, a standing condition is not', () => {
  // A page renders an outcome inside {#if form} with its text already in it,
  // and a live region that arrives full is not read out. Firefox builds its
  // accessibility tree after a frame's callbacks run, so the text waits two.
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  it('mounts an outcome without its text and fills it on the second frame', async () => {
    const { container, findByText, queryByText } = render(Alert, {
      props: { children: text('Email confirmed'), tone: 'success', autoDismiss: true },
    });
    const region = container.querySelector('[aria-live]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    // Atomic, as role="status" made it, so a change reads the whole message.
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(queryByText('Email confirmed')).toBeNull();
    await frame();
    expect(queryByText('Email confirmed')).toBeNull();
    const message = await findByText('Email confirmed');
    expect(region?.contains(message)).toBe(true);
  });

  it('announces a result that stays on screen when told to', async () => {
    // A confirmation that replaces a form, or a status a poll updates, stays
    // on screen and still has to be heard.
    const { container, findByText, queryByText, queryByLabelText } = render(Alert, {
      props: { children: text('Payment received'), tone: 'success', announce: true },
    });
    const region = container.querySelector('[aria-live]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.hasAttribute('role')).toBe(false);
    expect(queryByText('Payment received')).toBeNull();
    expect(region?.contains(await findByText('Payment received'))).toBe(true);
    expect(queryByLabelText('Dismiss')).toBeNull();
  });

  it('keeps a failure that stays an alert, told to announce or not', () => {
    const { container, getByText } = render(Alert, {
      props: { children: text('Payment failed'), tone: 'danger', announce: true },
    });
    expect(container.querySelector('[role="alert"]')?.getAttribute('aria-live')).toBe('assertive');
    expect(getByText('Payment failed')).toBeTruthy();
  });

  it('renders a standing condition whole and outside any live region', () => {
    // Chrome reads a polite region that a client-side navigation inserts, so a
    // standing condition would be read out because the page loaded.
    const { container, getByText } = render(Alert, {
      props: { children: text('Billing is active'), tone: 'success' },
    });
    expect(getByText('Billing is active')).toBeTruthy();
    expect(container.querySelector('[aria-live]')).toBeNull();
  });
});
