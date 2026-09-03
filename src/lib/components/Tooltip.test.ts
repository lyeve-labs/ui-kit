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
    const { queryByRole } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('shows the tooltip text on mouse enter and hides on leave', async () => {
    const { container, queryByRole, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    const wrap = container.firstElementChild as HTMLElement;
    await fireEvent.mouseEnter(wrap);
    expect(getByRole('tooltip').textContent).toContain('More info');
    await fireEvent.mouseLeave(wrap);
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('opens on keyboard focus reaching the trigger', async () => {
    // focus and blur do not bubble, so bound to the wrapper they never fired for
    // the control inside it and the tooltip was mouse-only. focusin does bubble.
    const { container, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: trigger },
    });
    const wrap = container.firstElementChild as HTMLElement;
    expect(getByRole('tooltip', { hidden: true }).hasAttribute('hidden')).toBe(true);

    await fireEvent.focusIn(wrap.querySelector('button') as HTMLElement);
    expect(getByRole('tooltip').hasAttribute('hidden')).toBe(false);

    await fireEvent.focusOut(wrap.querySelector('button') as HTMLElement);
    expect(getByRole('tooltip', { hidden: true }).hasAttribute('hidden')).toBe(true);
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
    expect(getByRole('tooltip').hasAttribute('hidden')).toBe(false);
    await fireEvent.keyDown(wrap, { key: 'Escape' });
    expect(getByRole('tooltip', { hidden: true }).hasAttribute('hidden')).toBe(true);
  });
});
