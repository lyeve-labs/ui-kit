import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyButton from './CopyButton.svelte';

const source = readFileSync(join(__dirname, 'CopyButton.svelte'), 'utf8');

/** Installs a clipboard whose writeText behaves the way the test needs. */
function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
}

/**
 * Takes the clipboard away, which is what the component meets on an insecure
 * origin. jsdom ships no clipboard either, so this is also the resting state.
 */
function removeClipboard(): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

/**
 * Flushes the microtasks the handler awaits, then the render.
 *
 * The click handler awaits the clipboard write, so its state change lands
 * several microtask turns after the event that started it, and tick() on its
 * own resolves before any of them.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  await tick();
}

function live(container: HTMLElement): HTMLElement {
  return container.querySelector('[aria-live]') as HTMLElement;
}

afterEach(() => {
  vi.useRealTimers();
  removeClipboard();
});

describe('CopyButton', () => {
  it('writes the value to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { getByRole } = render(CopyButton, { props: { value: 'lyv_live_9f2' } });

    await fireEvent.click(getByRole('button'));
    await settle();

    expect(writeText).toHaveBeenCalledWith('lyv_live_9f2');
  });

  it('names the button, and keeps that name through the copied state', async () => {
    // The live region reports the result. Renaming the button as well announces
    // the same word twice and leaves a control called "Copied" that copies.
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { getByRole } = render(CopyButton, { props: { value: 'x', label: 'Copy token' } });

    const button = getByRole('button', { name: 'Copy token' });
    await fireEvent.click(button);
    await settle();

    expect(getByRole('button', { name: 'Copy token' })).toBe(button);
  });

  it('swaps the copy icon for a check and reverts after 1.5 seconds', async () => {
    vi.useFakeTimers();
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });
    expect(container.querySelector('.lucide-copy')).toBeTruthy();

    await fireEvent.click(getByRole('button'));
    await settle();
    expect(container.querySelector('.lucide-check')).toBeTruthy();
    expect(container.querySelector('.lucide-copy')).toBeNull();

    vi.advanceTimersByTime(1499);
    await tick();
    expect(container.querySelector('.lucide-check')).toBeTruthy();

    vi.advanceTimersByTime(1);
    await tick();
    expect(container.querySelector('.lucide-copy')).toBeTruthy();
    expect(container.querySelector('.lucide-check')).toBeNull();
  });

  it('restarts the window when it is pressed again', async () => {
    // Without the clearTimeout at the top of the handler the first press's timer
    // reverts the second copy a third of the way into its own window.
    vi.useFakeTimers();
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });

    await fireEvent.click(getByRole('button'));
    await settle();
    vi.advanceTimersByTime(1000);
    await fireEvent.click(getByRole('button'));
    await settle();

    vi.advanceTimersByTime(1000);
    await tick();
    expect(live(container).textContent).toBe('Copied');

    vi.advanceTimersByTime(500);
    await tick();
    expect(live(container).textContent).toBe('');
  });
});

describe('CopyButton live region', () => {
  it('mounts the live region empty, so the copy is a change and not an arrival', async () => {
    // A region rendered only after the copy arrives already holding its text,
    // and assistive technology announces nothing at all. It watches an existing
    // region for a change. Toaster carries the same rule.
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });

    const region = live(container);
    expect(region).toBeTruthy();
    expect(region.textContent).toBe('');
    expect(region.getAttribute('aria-live')).toBe('polite');

    await fireEvent.click(getByRole('button'));
    await settle();

    // The same node, still on the page, now holding the message.
    expect(live(container)).toBe(region);
    expect(region.textContent).toBe('Copied');
  });

  it('announces the copiedLabel the caller supplied', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'x', copiedLabel: 'Token copied' },
    });

    await fireEvent.click(getByRole('button'));
    await settle();

    expect(live(container).textContent).toBe('Token copied');
  });
});

describe('CopyButton when the clipboard is unavailable', () => {
  it('says so, and stays usable, when navigator.clipboard is undefined', async () => {
    // The clipboard is undefined on an insecure origin. Reached through optional
    // chaining it would resolve to undefined rather than throw, so the await
    // succeeds and the button reports a copy that never happened.
    removeClipboard();
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });

    const button = getByRole('button');
    await fireEvent.click(button);
    await settle();

    expect(live(container).textContent).toBe('Copy failed');
    expect(container.querySelector('.lucide-check')).toBeNull();
    expect((button as HTMLButtonElement).disabled).toBe(false);

    // Still the same working control: a later press on a secure origin copies.
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    await fireEvent.click(button);
    await settle();
    expect(writeText).toHaveBeenCalledWith('x');
    expect(live(container).textContent).toBe('Copied');
  });

  it('says so, and stays usable, when writeText rejects on an unfocused document', async () => {
    // writeText rejects with NotAllowedError while the document is not focused,
    // which is what a press from a background window produces. Unhandled, the
    // page went silent and the button sat on its resting icon.
    const writeText = vi
      .fn()
      .mockRejectedValue(new Error('Document is not focused'))
      .mockName('writeText');
    stubClipboard(writeText);
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });

    const button = getByRole('button');
    await fireEvent.click(button);
    await settle();

    expect(writeText).toHaveBeenCalled();
    expect(live(container).textContent).toBe('Copy failed');
    expect(container.querySelector('.lucide-check')).toBeNull();
    expect(container.querySelector('.lucide-copy')).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it('clears the failure message on the same timer as a copy', async () => {
    vi.useFakeTimers();
    removeClipboard();
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });

    await fireEvent.click(getByRole('button'));
    await settle();
    expect(live(container).textContent).toBe('Copy failed');

    vi.advanceTimersByTime(1500);
    await tick();
    expect(live(container).textContent).toBe('');
  });
});

describe('CopyButton timer', () => {
  it('clears the revert timer on unmount, so it cannot write to a destroyed component', async () => {
    // The timer outlives the component otherwise. A table that swaps its rows
    // while a check is up leaves the callback assigning to a destroyed instance.
    vi.useFakeTimers();
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { getByRole, unmount } = render(CopyButton, { props: { value: 'x' } });
    expect(vi.getTimerCount()).toBe(0);

    await fireEvent.click(getByRole('button'));
    await settle();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});

describe('CopyButton presentation', () => {
  it('sizes the icon from the size prop', () => {
    const { container } = render(CopyButton, { props: { value: 'x', size: 20 } });
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('height')).toBe('20');
  });

  it('defaults the icon to 14px', () => {
    const { container } = render(CopyButton, { props: { value: 'x' } });
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('14');
  });

  it('lets the consumer position it', () => {
    const { container } = render(CopyButton, { props: { value: 'x', class: 'ml-auto' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('ml-auto');
  });

  it('draws its icons as SVG rather than as a Unicode character', () => {
    // A literal check mark renders at whatever weight the reader's font gives
    // it, which sat visibly lighter than every other icon in the library.
    expect(source).toContain("from '@lucide/svelte'");
    expect(source).not.toMatch(/[✓✔×]/);
  });

  it('states the duration of its colour transition', () => {
    expect(source).toContain('transition-colors duration-150');
  });
});
