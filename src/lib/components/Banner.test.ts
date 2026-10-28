import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Banner from './Banner.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/** The banner's own box, a live region or not. */
const root = (container: HTMLElement) => container.firstElementChild as HTMLElement | null;

describe('Banner', () => {
  it('renders children', () => {
    const { container, getByText } = render(Banner, {
      props: { children: text('Maintenance tonight') },
    });
    expect(getByText('Maintenance tonight')).toBeTruthy();
    expect(root(container)).toBeTruthy();
  });

  it('applies the tone class', () => {
    const { container } = render(Banner, {
      props: { children: text('x'), tone: 'success' },
    });
    expect(root(container)?.className).toContain('bg-success/10');
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
    expect(root(container)).toBeNull();
  });
});

describe('the live region follows the tone', () => {
  // "Payment failed" waited for a pause like any notice, because every tone
  // was role="status". A failure and a warning interrupt. Everything else
  // waits, and so does a banner that will take itself away. The polite
  // branch takes no role, because browsers expose role="status" as a status
  // bar and Orca speaks nothing inserted into one. A banner that neither
  // interrupts nor clears itself states a standing condition and is no live
  // region, so a page that shows it reads nothing out.
  const live = (props: Record<string, unknown>) => {
    const { container } = render(Banner, { props: { children: text('x'), ...props } });
    const root = container.firstElementChild;
    return `${root?.getAttribute('role') ?? 'no role'} ${root?.getAttribute('aria-live') ?? 'not live'}`;
  };

  it.each([
    ['danger', 'alert assertive'],
    ['warn', 'alert assertive'],
    ['success', 'no role not live'],
    ['brand', 'no role not live'],
    ['info', 'no role not live'],
    ['neutral', 'no role not live'],
  ])('a %s banner is %s', (tone, expected) => {
    expect(live({ tone })).toBe(expected);
  });

  it('keeps a banner that clears itself polite, whatever its tone', () => {
    expect(live({ tone: 'warn', autoDismiss: true })).toBe('no role polite');
    expect(live({ tone: 'danger', autoDismiss: 3000 })).toBe('no role polite');
  });
});

describe('a confirmation that clears itself', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays put by default', async () => {
    const { container } = render(Banner, { props: { children: text('x'), tone: 'success' } });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(root(container)).toBeTruthy();
  });

  it('closes itself after the default delay, the same one Alert waits', async () => {
    const { container } = render(Banner, {
      props: { children: text('x'), tone: 'success', autoDismiss: true },
    });
    await vi.advanceTimersByTimeAsync(4_900);
    expect(root(container)).toBeTruthy();
    await vi.advanceTimersByTimeAsync(200);
    expect(root(container)).toBeNull();
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
    await fireEvent.mouseEnter(root(container)!);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(root(container)).toBeTruthy();
  });
});

describe('an outcome is announced, a standing condition is not', () => {
  // A page renders an outcome inside {#if form} with its text already in it,
  // and a live region that arrives full is not read out. Firefox builds its
  // accessibility tree after a frame's callbacks run, so the text waits two.
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  it('mounts an outcome without its text and fills it on the second frame', async () => {
    const { container, findByText, queryByText } = render(Banner, {
      props: { children: text('Email confirmed'), tone: 'success', autoDismiss: true },
    });
    const region = root(container);
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
    const { container, findByText, queryByText, queryByLabelText } = render(Banner, {
      props: { children: text('Payment received'), tone: 'success', announce: true },
    });
    const region = root(container);
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.hasAttribute('role')).toBe(false);
    expect(queryByText('Payment received')).toBeNull();
    expect(region?.contains(await findByText('Payment received'))).toBe(true);
    expect(queryByLabelText('Dismiss')).toBeNull();
  });

  it('keeps a failure that stays an alert, told to announce or not', () => {
    const { container, getByText } = render(Banner, {
      props: { children: text('Payment failed'), tone: 'danger', announce: true },
    });
    expect(container.querySelector('[role="alert"]')?.getAttribute('aria-live')).toBe('assertive');
    expect(getByText('Payment failed')).toBeTruthy();
  });

  it('renders a standing condition whole and outside any live region', () => {
    // Chrome reads a polite region that a client-side navigation inserts, so a
    // standing condition would be read out because the page loaded.
    const { container, getByText } = render(Banner, {
      props: { children: text('Billing is active'), tone: 'success' },
    });
    expect(getByText('Billing is active')).toBeTruthy();
    expect(container.querySelector('[aria-live]')).toBeNull();
  });
});
