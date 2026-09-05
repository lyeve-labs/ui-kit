import { Moon, Sun } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SegmentedControl from './SegmentedControl.svelte';

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const source = readFileSync(join(__dirname, 'SegmentedControl.svelte'), 'utf8');

/** The source with its comments removed, so a guard cannot pass on its own prose. */
const code = source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

function segments(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
}

function checked(container: HTMLElement): (string | null)[] {
  return segments(container).map((s) => s.getAttribute('aria-checked'));
}

function tabbable(container: HTMLElement): HTMLButtonElement[] {
  return segments(container).filter((s) => s.getAttribute('tabindex') === '0');
}

describe('SegmentedControl', () => {
  it('renders one radio per option inside a radiogroup', () => {
    const { container, getByRole } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    expect(getByRole('radiogroup')).toBeTruthy();
    expect(segments(container)).toHaveLength(3);
  });

  it.each([false, true])('has an accessible name with labelHidden=%s', (labelHidden) => {
    // An unnamed group announces as a bare set of controls, so the reader is
    // left to work out what the set is for from the segments alone.
    const { getByRole, queryByText } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', labelHidden },
    });
    expect(getByRole('radiogroup', { name: 'Theme' })).toBeTruthy();
    // Hidden takes the caption off the page. The name is on the group either
    // way, so nothing is lost and nothing is announced twice.
    expect(queryByText('Theme') === null).toBe(labelHidden);
  });

  it('reports the chosen value and moves the selection to it', async () => {
    const onchange = vi.fn();
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', onchange },
    });

    await fireEvent.click(segments(container)[1]);

    expect(onchange).toHaveBeenCalledWith('dark');
    expect(checked(container)).toEqual(['false', 'true', 'false']);
  });

  it('stays quiet when the segment already chosen is pressed', async () => {
    const onchange = vi.fn();
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', onchange },
    });

    await fireEvent.click(segments(container)[0]);

    expect(onchange).not.toHaveBeenCalled();
    expect(checked(container)).toEqual(['true', 'false', 'false']);
  });

  it('renders the icon a segment carries', () => {
    const { container } = render(SegmentedControl, {
      props: {
        label: 'Theme',
        value: 'light',
        options: [
          { value: 'light', label: 'Light', icon: Sun },
          { value: 'dark', label: 'Dark', icon: Moon },
        ],
      },
    });
    expect(container.querySelector('.lucide-sun')).toBeTruthy();
    expect(container.querySelector('.lucide-moon')).toBeTruthy();
    // Sized by the control, so the caller does not guess.
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('16');
  });

  it('keys every segment by its value', () => {
    // An unkeyed each reuses the node in place, so reordering the options
    // leaves the selected treatment on whatever used to sit at that index.
    expect(code).toContain('(option.value)');
  });
});

describe('SegmentedControl aria state', () => {
  it('tracks the value with aria-checked', async () => {
    const { container, rerender } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    expect(checked(container)).toEqual(['true', 'false', 'false']);

    await rerender({ label: 'Theme', options, value: 'system' });
    expect(checked(container)).toEqual(['false', 'false', 'true']);
  });

  it('carries the selection in weight as well as in colour', () => {
    // The theme picker this replaces marked its choice with a background colour
    // and nothing else, so a colour-blind user could not see which option was
    // active and a screen reader user was told nothing at all.
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'dark' },
    });
    const weights = segments(container).map(
      (s) => (s.querySelector('span.grid > span:last-child') as HTMLElement).className,
    );
    expect(weights[0]).toContain('font-normal');
    expect(weights[1]).toContain('font-semibold');
    expect(weights[2]).toContain('font-normal');
  });
});

describe('SegmentedControl roving tabindex', () => {
  it('holds exactly one tab stop, on the chosen segment', () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'dark' },
    });
    expect(tabbable(container)).toHaveLength(1);
    expect(tabbable(container)[0]).toBe(segments(container)[1]);
    expect(segments(container).map((s) => s.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('keeps exactly one tab stop after the selection moves', async () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    await fireEvent.keyDown(segments(container)[0], { key: 'ArrowRight' });
    expect(tabbable(container)).toHaveLength(1);
    expect(tabbable(container)[0]).toBe(segments(container)[1]);
  });

  it('holds the tab stop on the first segment when the value matches no option', () => {
    // Every segment at tabindex -1 drops the whole control out of the tab order,
    // so a group with nothing chosen would be unreachable by keyboard.
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'sepia' },
    });
    expect(checked(container)).toEqual(['false', 'false', 'false']);
    expect(tabbable(container)).toHaveLength(1);
    expect(tabbable(container)[0]).toBe(segments(container)[0]);
  });
});

describe('SegmentedControl keyboard', () => {
  it('moves the selection right with ArrowRight and ArrowDown', async () => {
    const onchange = vi.fn();
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', onchange },
    });

    await fireEvent.keyDown(segments(container)[0], { key: 'ArrowRight' });
    expect(checked(container)).toEqual(['false', 'true', 'false']);

    await fireEvent.keyDown(segments(container)[1], { key: 'ArrowDown' });
    expect(checked(container)).toEqual(['false', 'false', 'true']);
    expect(onchange.mock.calls).toEqual([['dark'], ['system']]);
  });

  it('moves the selection left with ArrowLeft and ArrowUp', async () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'system' },
    });

    await fireEvent.keyDown(segments(container)[2], { key: 'ArrowLeft' });
    expect(checked(container)).toEqual(['false', 'true', 'false']);

    await fireEvent.keyDown(segments(container)[1], { key: 'ArrowUp' });
    expect(checked(container)).toEqual(['true', 'false', 'false']);
  });

  it('wraps past the last segment and before the first', async () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'system' },
    });

    await fireEvent.keyDown(segments(container)[2], { key: 'ArrowRight' });
    expect(checked(container)).toEqual(['true', 'false', 'false']);

    await fireEvent.keyDown(segments(container)[0], { key: 'ArrowLeft' });
    expect(checked(container)).toEqual(['false', 'false', 'true']);
  });

  it('goes to the ends with Home and End', async () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'dark' },
    });

    await fireEvent.keyDown(segments(container)[1], { key: 'End' });
    expect(checked(container)).toEqual(['false', 'false', 'true']);

    await fireEvent.keyDown(segments(container)[2], { key: 'Home' });
    expect(checked(container)).toEqual(['true', 'false', 'false']);
  });

  it('takes focus with the selection', async () => {
    // The one tab stop is only one tab stop if focus follows it. Left behind,
    // the next arrow press starts from the segment the user has already left.
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });

    await fireEvent.keyDown(segments(container)[0], { key: 'End' });
    expect(document.activeElement).toBe(segments(container)[2]);

    await fireEvent.keyDown(segments(container)[2], { key: 'Home' });
    expect(document.activeElement).toBe(segments(container)[0]);
  });

  it('stops the arrows and the ends from scrolling the page', async () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      segments(container)[0].dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(true);
    }
  });

  it('leaves every other key to the page', async () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    segments(container)[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(checked(container)).toEqual(['true', 'false', 'false']);
  });
});

describe('SegmentedControl disabled', () => {
  it('blocks a change from the pointer and from the keyboard', async () => {
    const onchange = vi.fn();
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', disabled: true, onchange },
    });

    expect(segments(container).map((s) => s.disabled)).toEqual([true, true, true]);

    await fireEvent.click(segments(container)[1]);
    await fireEvent.keyDown(segments(container)[0], { key: 'ArrowRight' });

    expect(onchange).not.toHaveBeenCalled();
    expect(checked(container)).toEqual(['true', 'false', 'false']);
  });
});

describe('SegmentedControl form submission', () => {
  it('carries the value in a hidden input when name is set', async () => {
    // A div with role="radiogroup" submits nothing.
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', name: 'theme' },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).toBeTruthy();
    expect(hidden.name).toBe('theme');
    expect(hidden.value).toBe('light');

    await fireEvent.click(segments(container)[2]);
    expect(hidden.value).toBe('system');
  });

  it('renders no hidden input when there is no name to post it under', () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it('posts one value, not one per segment', () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', name: 'theme' },
    });
    expect(container.querySelectorAll('input')).toHaveLength(1);
  });
});

describe('SegmentedControl presentation', () => {
  it('lets the consumer position it', () => {
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', class: 'mt-4' },
    });
    expect((container.firstElementChild as HTMLElement).className).toContain('mt-4');
  });

  it.each([
    { size: 'sm' as const, row: 'h-8' },
    { size: 'md' as const, row: 'h-control' },
  ])('states the $size row height as a utility, never as a literal', ({ size, row }) => {
    const { getByRole } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light', size },
    });
    expect(getByRole('radiogroup').className).toContain(row);
  });

  it('rests its border on line-strong, never on line', () => {
    // line reads 1.25:1 against the page, and the border is the only thing
    // marking the row as a control.
    const { getByRole } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'light' },
    });
    const classes = getByRole('radiogroup').className.split(/\s+/);
    expect(classes).toContain('border-line-strong');
    expect(classes).not.toContain('border-line');
  });

  it('draws its focus ring inset, once, outside the selected branch', () => {
    // A segment sits flush inside the row's padding, so the global 2px outset
    // outline is drawn over the row's own border.
    const { container } = render(SegmentedControl, {
      props: { label: 'Theme', options, value: 'dark' },
    });
    for (const segment of segments(container)) {
      const classes = segment.className.split(/\s+/);
      expect(classes, segment.textContent ?? '').toContain('focus-visible:ring-2');
      expect(classes).toContain('focus-visible:ring-inset');
      expect(classes).toContain('focus-visible:ring-brand');
    }
  });
});
