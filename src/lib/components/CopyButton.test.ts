import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyButton from './CopyButton.svelte';

const source = readFileSync(join(__dirname, 'CopyButton.svelte'), 'utf8');
const glyphSource = readFileSync(join(__dirname, '../internal/CopyGlyph.svelte'), 'utf8');

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

/** Which icon the glyph is showing. Both stay mounted and cross over in place. */
function glyph(container: HTMLElement): string | null {
  return container.querySelector('[data-copy-state]')?.getAttribute('data-copy-state') ?? null;
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
    expect(glyph(container)).toBe('idle');

    await fireEvent.click(getByRole('button'));
    await settle();
    expect(glyph(container)).toBe('copied');

    vi.advanceTimersByTime(1499);
    await tick();
    expect(glyph(container)).toBe('copied');

    vi.advanceTimersByTime(1);
    await tick();
    expect(glyph(container)).toBe('idle');
    expect(glyph(container)).toBe('idle');
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
    // A status role reads as a status bar to Orca, which speaks nothing put
    // into one. Generic is a section, which Orca reads even right after the
    // region appears. A span keeps a paragraph that holds the button whole.
    expect(region.getAttribute('role')).toBe('generic');
    expect(region.tagName).toBe('SPAN');

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
    expect(glyph(container)).toBe('idle');
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
    expect(glyph(container)).toBe('idle');
    expect(glyph(container)).toBe('idle');
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
    expect(glyphSource).toContain("from '@lucide/svelte'");
    expect(source + glyphSource).not.toMatch(/[✓✔×]/);
  });

  it('transitions its color on the theme clock, with no number of its own', () => {
    expect(source).toContain('transition-colors');
    expect(source).not.toMatch(/duration-\d/);
  });

  it('crosses the icons over on the motion rungs, the exit one faster than the entrance', () => {
    expect(glyphSource).toContain('duration-base ease-enter');
    expect(glyphSource).toContain('duration-fast ease-exit');
    expect(glyphSource).not.toMatch(/duration-\d/);
  });
});

describe('CopyButton under a finger', () => {
  /*
   * The one control on the page whose whole job is to be pressed. `hover:`
   * never matches a touch screen, so on a phone the only signal that the press
   * had registered was the icon swap that follows the clipboard write, which
   * does not happen at all on an insecure origin.
   */
  it('acknowledges the press itself, not just the result', () => {
    const { container } = render(CopyButton, { props: { value: 'sk-live-1' } });
    expect((container.querySelector('button') as HTMLElement).className).toMatch(/\bactive:/);
  });
});

describe('CopyButton with text', () => {
  it('shows the words beside the icon and takes its name from them', () => {
    const { getByRole } = render(CopyButton, {
      props: { value: 'a\nb', text: 'Copy all codes' },
    });
    const button = getByRole('button', { name: 'Copy all codes' });
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.textContent?.trim()).toBe('Copy all codes');
    // The icon stays, and stays out of the name.
    expect(button.querySelector('[data-copy-state]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('names the button by the words on screen even when a label is passed', () => {
    // A voice-control user speaks what the button shows. A label that said
    // something else would leave the visible words naming nothing.
    const { getByRole } = render(CopyButton, {
      props: { value: 'x', text: 'Copy all codes', label: 'Copy' },
    });
    expect(getByRole('button', { name: 'Copy all codes' })).toBeTruthy();
  });

  it('keeps its words and its name through the copied state', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'x', text: 'Copy all codes' },
    });
    const button = getByRole('button', { name: 'Copy all codes' });

    await fireEvent.click(button);
    await settle();

    expect(glyph(container)).toBe('copied');
    expect(live(container).textContent).toBe('Copied');
    expect(getByRole('button', { name: 'Copy all codes' })).toBe(button);
  });

  it('pads and colors the words as a text action, and keeps the hit box', () => {
    const { getByRole } = render(CopyButton, {
      props: { value: 'x', text: 'Copy all codes' },
    });
    const classes = getByRole('button').className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(['gap-1.5', 'px-2', 'text-sm', 'text-muted']));
    expect(classes).toEqual(expect.arrayContaining(['relative', 'hit-area']));
    expect(classes).toContain('transition-colors');
  });

  it('keeps the icon-only button as it was when no text is given', () => {
    const { getByRole } = render(CopyButton, { props: { value: 'x' } });
    const button = getByRole('button', { name: 'Copy' });
    expect(button.getAttribute('aria-label')).toBe('Copy');
    expect(button.textContent?.trim()).toBe('');
    const classes = button.className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(['p-1', 'text-faint']));
    expect(classes).not.toContain('text-muted');
  });
});

describe('CopyButton title', () => {
  const tooltip = (c: HTMLElement) => c.querySelector<HTMLElement>('.z-tooltip');

  it('shows no tooltip when no title is given', () => {
    const { container, getByRole } = render(CopyButton, { props: { value: 'x' } });
    expect(tooltip(container)).toBeNull();
    expect(getByRole('button').hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps the label on an icon-only button and describes it with the title', async () => {
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'k', label: 'Copy key', title: 'Copy the signing key' },
    });
    await tick();
    const button = getByRole('button', { name: 'Copy key' });
    expect(button.getAttribute('aria-label')).toBe('Copy key');
    const tip = tooltip(container) as HTMLElement;
    expect(tip.textContent?.trim()).toBe('Copy the signing key');
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('keeps the visible text as the name of a button with text', async () => {
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'k', text: 'Copy all codes', title: 'Copies all ten codes' },
    });
    await tick();
    const button = getByRole('button', { name: 'Copy all codes' });
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(tooltip(container)?.textContent?.trim()).toBe('Copies all ten codes');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip(container)?.id);
  });

  it('shows the title on keyboard focus and on hover', async () => {
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'k', title: 'Copy the signing key' },
    });
    const tip = tooltip(container) as HTMLElement;
    expect(tip.className).toContain('invisible');
    await fireEvent.focusIn(getByRole('button'));
    expect(tip.className).not.toContain('invisible');
    await fireEvent.focusOut(getByRole('button'));
    expect(tip.className).toContain('invisible');
    await fireEvent.mouseEnter(tip.parentElement as HTMLElement);
    expect(tip.className).not.toContain('invisible');
  });

  it('does not describe the button with the words that already name it', async () => {
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'k', label: 'Copy key', title: 'Copy key' },
    });
    await tick();
    const button = getByRole('button', { name: 'Copy key' });
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(tooltip(container)?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not describe the button with its name in other case or spacing', async () => {
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'k', text: 'Copy all codes', title: ' copy ALL codes ' },
    });
    await tick();
    expect(getByRole('button').hasAttribute('aria-describedby')).toBe(false);
    expect(tooltip(container)?.getAttribute('aria-hidden')).toBe('true');
  });

  it('closes the tooltip on Escape without moving focus', async () => {
    const { container, getByRole } = render(CopyButton, {
      props: { value: 'k', title: 'Copy the signing key' },
    });
    const button = getByRole('button');
    const tip = tooltip(container) as HTMLElement;
    button.focus();
    await fireEvent.focusIn(button);
    expect(tip.className).not.toContain('invisible');
    await fireEvent.keyDown(button, { key: 'Escape' });
    expect(tip.className).toContain('invisible');
    expect(document.activeElement).toBe(button);
  });

  it('copies through the tooltip wrapper', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { getByRole } = render(CopyButton, {
      props: { value: 'secret-value', title: 'Copy the signing key' },
    });
    await fireEvent.click(getByRole('button'));
    expect(writeText).toHaveBeenCalledWith('secret-value');
  });
});
