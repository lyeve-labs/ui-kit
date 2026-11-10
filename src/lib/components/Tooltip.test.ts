import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Tooltip from './Tooltip.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/** A focusable trigger, which is what the tooltip has to attach its name to. */
const trigger = createRawSnippet(() => ({ render: () => '<button type="button">?</button>' }));

describe('Tooltip', () => {
  it('renders the trigger children', () => {
    const { getByText } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    expect(getByText('?')).toBeTruthy();
  });

  it('hides the tooltip until hovered', () => {
    // In the document and invisible, not absent: the trigger's aria-describedby
    // needs the element to exist, and visibility is what the transition moves.
    const { getByRole } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    expect(getByRole('tooltip', { hidden: true }).classList.contains('invisible')).toBe(true);
  });

  it('shows the tooltip text on mouse enter and hides on leave', async () => {
    const { container, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    const wrap = container.firstElementChild as HTMLElement;
    await fireEvent.mouseEnter(wrap);
    expect(getByRole('tooltip').textContent).toContain('More info');
    expect(getByRole('tooltip').classList.contains('invisible')).toBe(false);
    await fireEvent.mouseLeave(wrap);
    expect(getByRole('tooltip', { hidden: true }).classList.contains('invisible')).toBe(true);
  });

  it('opens on keyboard focus reaching the trigger', async () => {
    // focus and blur do not bubble, so bound to the wrapper they never fired for
    // the control inside it and the tooltip was mouse-only. focusin does bubble.
    const { container, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: trigger },
    });
    const wrap = container.firstElementChild as HTMLElement;
    expect(getByRole('tooltip', { hidden: true }).classList.contains('invisible')).toBe(true);

    await fireEvent.focusIn(wrap.querySelector('button') as HTMLElement);
    expect(getByRole('tooltip').classList.contains('invisible')).toBe(false);

    await fireEvent.focusOut(wrap.querySelector('button') as HTMLElement);
    expect(getByRole('tooltip', { hidden: true }).classList.contains('invisible')).toBe(true);
  });

  it('points the trigger at the tooltip so it is announced', () => {
    const { container, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: trigger },
    });
    const button = container.querySelector('button') as HTMLElement;
    const tip = getByRole('tooltip', { hidden: true });
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.id).toBeTruthy();
  });

  it('dismisses on Escape without moving the pointer or the focus', async () => {
    const { container, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: trigger },
    });
    const wrap = container.firstElementChild as HTMLElement;
    await fireEvent.mouseEnter(wrap);
    expect(getByRole('tooltip').classList.contains('invisible')).toBe(false);
    await fireEvent.keyDown(wrap, { key: 'Escape' });
    expect(getByRole('tooltip', { hidden: true }).classList.contains('invisible')).toBe(true);
  });
});

describe('Tooltip describe', () => {
  it('leaves the trigger undescribed and the text out of the tree when switched off', () => {
    const { container } = render(Tooltip, {
      props: { text: 'Delete', describe: false, children: trigger },
    });
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toContain('Delete');
  });
});

/*
 * The box is fixed to the viewport and sized to its text. Inside the wrapper
 * it took the wrapper's width and any scrolling ancestor clipped it, which a
 * hint on a row action in a table met on its first day.
 */
describe('Tooltip placement', () => {
  it('sizes to its text and positions itself fixed from the trigger', async () => {
    const { container } = render(Tooltip, { props: { text: 'Delete default', children: trigger } });
    const wrapper = container.firstElementChild as HTMLElement;
    wrapper.getBoundingClientRect = () =>
      ({ top: 100, bottom: 130, left: 400, right: 430, width: 30, height: 30 }) as DOMRect;

    await fireEvent.mouseEnter(wrapper);

    const tip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tip.className).toContain('fixed');
    expect(tip.className).toContain('w-max');
    expect(tip.style.top).toBe('92px');
    expect(tip.style.left).toBe('415px');
  });

  it('closes when anything scrolls, since a fixed box cannot follow its trigger', async () => {
    const { container } = render(Tooltip, { props: { text: 'Delete', children: trigger } });
    const wrapper = container.firstElementChild as HTMLElement;
    await fireEvent.mouseEnter(wrapper);
    const tip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tip.classList.contains('invisible')).toBe(false);

    await fireEvent.scroll(window);

    expect(tip.classList.contains('invisible')).toBe(true);
  });
});

/*
 * jsdom has no layout, so the trigger's box, the hint's size and the window
 * are stubbed. A hint centered on a trigger at the window's edge was cut off.
 */
describe('Tooltip stays inside the window', () => {
  const real = { width: window.innerWidth, height: window.innerHeight };

  function windowSize(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
  }

  afterEach(() => windowSize(real.width, real.height));

  async function open(
    rect: { top: number; left: number; width: number; height: number },
    position: 'top' | 'bottom' | 'left' | 'right' = 'top',
  ) {
    windowSize(1440, 900);
    const { container } = render(Tooltip, {
      props: { text: 'Delete', position, children: trigger },
    });
    const wrapper = container.firstElementChild as HTMLElement;
    wrapper.getBoundingClientRect = () =>
      ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
      }) as DOMRect;
    const tip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
    Object.defineProperty(tip, 'offsetWidth', { value: 120, configurable: true });
    Object.defineProperty(tip, 'offsetHeight', { value: 30, configurable: true });
    await fireEvent.mouseEnter(wrapper);
    return tip;
  }

  it('keeps a hint on a trigger at the right edge 8px inside the window', async () => {
    const tip = await open({ top: 100, left: 1410, width: 20, height: 30 });
    const center = parseFloat(tip.style.left);
    expect(center + 60).toBeLessThanOrEqual(1432);
    expect(center - 60).toBeGreaterThanOrEqual(8);
  });

  it('flips below a trigger at the top of the window', async () => {
    const tip = await open({ top: 4, left: 400, width: 30, height: 30 });
    expect(tip.style.top).toBe('42px');
    expect(tip.className).not.toContain('-translate-y-full');
  });

  it('places a hint with room on every side exactly as before', async () => {
    const tip = await open({ top: 100, left: 400, width: 30, height: 30 });
    expect(tip.style.top).toBe('92px');
    expect(tip.style.left).toBe('415px');
    expect(tip.className).toContain('-translate-x-1/2 -translate-y-full');
  });

  it('flips a left hint to the right of a trigger at the left edge', async () => {
    const tip = await open({ top: 400, left: 10, width: 30, height: 30 }, 'left');
    expect(tip.style.left).toBe('48px');
    expect(tip.style.top).toBe('415px');
    expect(tip.className).not.toContain('-translate-x-full');
  });

  it('flips a right hint to the left of a trigger at the right edge', async () => {
    const tip = await open({ top: 400, left: 1400, width: 30, height: 30 }, 'right');
    expect(tip.style.left).toBe('1392px');
    expect(tip.style.top).toBe('415px');
    expect(tip.className).toContain('-translate-x-full');
  });
});
