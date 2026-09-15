import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
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
