import { Settings } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { CHOICE_ICON_PX, type ChoiceSize } from '../internal/choice.js';
import Radio from './Radio.svelte';

/** The element the peer focus ring can actually reach: a sibling after the input. */
function ringTargets(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('input ~ [class*="peer-focus-visible:"]')];
}

describe('Radio', () => {
  it('is checked when the group matches its value', () => {
    const { container } = render(Radio, { props: { value: 'a', group: 'a' } });
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).checked).toBe(true);
  });

  it('is unchecked when the group differs', () => {
    const { container } = render(Radio, { props: { value: 'a', group: 'b' } });
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it('renders label and hint', () => {
    const { getByText } = render(Radio, {
      props: { value: 'a', label: 'Option A', hint: 'the first one' },
    });
    expect(getByText('Option A')).toBeTruthy();
    expect(getByText('the first one')).toBeTruthy();
  });

  it('fires onchange with its value when selected', async () => {
    const onchange = vi.fn();
    const { container } = render(Radio, { props: { value: 'a', group: 'b', onchange } });
    await fireEvent.click(container.querySelector('input[type="radio"]') as HTMLInputElement);
    expect(onchange).toHaveBeenCalledWith('a');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Radio, { props: { value: 'a', disabled: true } });
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it('the input covers the painted dot, so a click aimed at it lands on it', () => {
    const { container } = render(Radio, { props: { value: 'a' } });
    const input = container.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.className).not.toContain('sr-only');
    expect(input.className).toContain('absolute');
    expect(input.className).toContain('inset-0');
    expect(input.className).toContain('h-full');
    expect(input.className).toContain('w-full');
    expect((input.nextElementSibling as HTMLElement).className).toContain('pointer-events-none');
  });

  it('keeps a focus indicator after it is selected', () => {
    // Same defect as Checkbox: the ring sat only on the unselected classes.
    for (const group of ['', 'a']) {
      const { container, unmount } = render(Radio, { props: { group, value: 'a', label: 'x' } });
      const dot = container.querySelector('input + span') as HTMLElement;
      expect(dot.className, `group=${group}`).toContain('peer-focus-visible:outline');
      unmount();
    }
  });

  // A radio has no third state, so the table covers the two it does have. The
  // ring is written outside the selected branch, which is the defect the
  // library keeps reintroducing: selecting an option must not delete the only
  // indicator a keyboard user has.
  it.each([
    { name: 'unselected', group: 'b' },
    { name: 'selected', group: 'a' },
  ])('states the focus ring once, so it survives the $name state', ({ group }) => {
    const { container } = render(Radio, { props: { value: 'a', group, label: 'x' } });
    const ring = container.querySelector('input + span') as HTMLElement;
    expect(ring.className).toContain('peer-focus-visible:outline');
    expect(ring.className).toContain('peer-focus-visible:outline-brand');
    expect(ring.className).toContain('peer-focus-visible:outline-offset-2');
  });

  it('marks its ring with the stronger border, not the divider colour', () => {
    // `line` is 1.25:1 against the surface, and the ring is the only thing
    // identifying an unselected radio as a control.
    const { container } = render(Radio, { props: { value: 'a', group: 'b', label: 'x' } });
    const ring = container.querySelector('input + span') as HTMLElement;
    expect(ring.className).toContain('border-line-strong');
  });

  it('draws its selected dot without a Unicode glyph', () => {
    const { container } = render(Radio, { props: { value: 'a', group: 'a', label: 'x' } });
    const ring = container.querySelector('input + span') as HTMLElement;
    expect(ring.textContent?.trim()).toBe('');
    expect(/[×−✓ℹ]/.test(container.innerHTML)).toBe(false);
    expect((ring.firstElementChild as HTMLElement).className).toContain('bg-brand');
  });

  it.each(['sm', 'md', 'lg'] as ChoiceSize[])('draws its icon at CHOICE_ICON_PX for %s', (size) => {
    const { container } = render(Radio, {
      props: { value: 'a', label: 'Billing', icon: Settings, size },
    });
    // A radio draws its selected dot as a span, so the only svg is the icon.
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe(String(CHOICE_ICON_PX[size]));
    expect(svg.getAttribute('height')).toBe(String(CHOICE_ICON_PX[size]));
  });

  it('keeps a real label association when the label is hidden', () => {
    // A radio in a table cell takes its visible name from the column header,
    // and the row still has to be named for a reader who cannot see the column.
    const { container, getByLabelText } = render(Radio, {
      props: { value: 'row-3', label: 'Select row 3', labelHidden: true },
    });
    const input = container.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(getByLabelText('Select row 3')).toBe(input);
    expect((container.querySelector('[id$="-label"]') as HTMLElement).className).toContain(
      'sr-only',
    );
  });

  it('gives the card variant one focus indicator, not one on the ring and one on the card', () => {
    const card = render(Radio, { props: { value: 'a', label: 'Pro', variant: 'card' } });
    const targets = ringTargets(card.container);
    expect(targets).toHaveLength(1);
    // The one indicator belongs to the card surface, which is what the input
    // covers, and not to the small ring drawn inside it.
    expect(targets[0].className).toContain('rounded-lg');
    card.unmount();

    const inline = render(Radio, { props: { value: 'a', label: 'Pro' } });
    expect(ringTargets(inline.container)).toHaveLength(1);
  });

  it('points aria-describedby at the error, then the hint, then the description', () => {
    const all = render(Radio, {
      props: {
        id: 'plan',
        value: 'pro',
        label: 'Pro',
        description: 'Everything in Team',
        hint: 'You can change this later',
        error: 'Pick a plan',
      },
    });
    const input = all.container.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe('plan-error');
    // aria-invalid is not supported on role radio, and one option is not the
    // thing that is invalid, so the error reaches a reader through the
    // description alone.
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(all.container.querySelector('#plan-error')?.textContent).toBe('Pick a plan');
    all.unmount();

    const hinted = render(Radio, {
      props: {
        id: 'plan',
        value: 'pro',
        label: 'Pro',
        description: 'Everything in Team',
        hint: 'You can change this later',
      },
    });
    const hintedInput = hinted.container.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(hintedInput.getAttribute('aria-describedby')).toBe('plan-hint');
    hinted.unmount();

    const described = render(Radio, {
      props: { id: 'plan', value: 'pro', label: 'Pro', description: 'Everything in Team' },
    });
    const describedInput = described.container.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement;
    expect(describedInput.getAttribute('aria-describedby')).toBe('plan-description');
    expect(described.container.querySelector('#plan-description')?.textContent).toBe(
      'Everything in Team',
    );
    described.unmount();

    const bare = render(Radio, { props: { id: 'plan', value: 'pro', label: 'Pro' } });
    const bareInput = bare.container.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(bareInput.hasAttribute('aria-describedby')).toBe(false);
  });

  it('marks a required option the way a checkbox does', () => {
    // The two controls disagreed here: a required checkbox showed a marker and
    // a required radio showed nothing, so one form asked for the same thing in
    // two ways.
    const { container } = render(Radio, { props: { value: 'a', label: 'Agree', required: true } });
    expect(container.querySelector('span[aria-label="required"]')?.textContent).toBe('*');
  });

  it('blocks the change handler while disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(Radio, {
      props: { value: 'a', group: 'b', label: 'Option A', disabled: true, onchange },
    });
    const input = container.querySelector('input[type="radio"]') as HTMLInputElement;
    await fireEvent.click(input);
    expect(onchange).not.toHaveBeenCalled();
    // The ring is still painted as unselected, so the component's own state did
    // not move either.
    expect((container.querySelector('input + span') as HTMLElement).className).toContain(
      'border-line-strong',
    );
  });
});
