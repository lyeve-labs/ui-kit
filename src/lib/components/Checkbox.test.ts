import { Settings } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { CHOICE_ICON_PX, CHOICE_MARK, type ChoiceSize } from '../internal/choice.js';
import Checkbox from './Checkbox.svelte';

/** The element the peer focus ring can actually reach: a sibling after the input. */
function ringTargets(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('input ~ [class*="peer-focus-visible:"]')];
}

describe('Checkbox', () => {
  it('renders label and hint', () => {
    const { getByText } = render(Checkbox, {
      props: { label: 'Accept terms', hint: 'Required to continue' },
    });
    expect(getByText('Accept terms')).toBeTruthy();
    expect(getByText('Required to continue')).toBeTruthy();
  });

  it('reflects the checked state and renders the checkmark', () => {
    const { container } = render(Checkbox, { props: { checked: true } });
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows a required marker and keeps it out of the accessible name', () => {
    // The marker carried aria-label="required". The label span is what
    // aria-labelledby points at, so name computation walked into it and the
    // control announced as "Agree required". The asterisk is paint; the input's
    // own required attribute is what reports the state.
    const { container, getByRole } = render(Checkbox, {
      props: { label: 'Agree', required: true },
    });
    expect(getByRole('checkbox', { name: 'Agree' })).toBeTruthy();
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).required).toBe(
      true,
    );
    const marker = container.querySelector('span[id$="-label"] span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('fires onchange with the new boolean when toggled', async () => {
    const onchange = vi.fn();
    const { container } = render(Checkbox, { props: { checked: false, onchange } });
    await fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);
    expect(onchange).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Checkbox, { props: { disabled: true } });
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it('the input covers the painted box, so a click aimed at it lands on it', () => {
    const { container } = render(Checkbox, { props: { label: 'admin' } });
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    // sr-only leaves the input 1x1 and buried under the box that replaces it,
    // so nothing can click it. It has to cover what the user actually sees.
    expect(input.className).not.toContain('sr-only');
    expect(input.className).toContain('absolute');
    expect(input.className).toContain('inset-0');
    expect(input.className).toContain('h-full');
    expect(input.className).toContain('w-full');
    expect((input.nextElementSibling as HTMLElement).className).toContain('pointer-events-none');
  });

  it('keeps a focus indicator after it is ticked', () => {
    // The ring lived only on the unchecked classes, so ticking a box removed
    // the only thing telling a keyboard user where they were. In a permissions
    // matrix of a hundred boxes that loses your place entirely.
    for (const checked of [false, true]) {
      const { container, unmount } = render(Checkbox, { props: { checked, label: 'x' } });
      const box = container.querySelector('input + span') as HTMLElement;
      expect(box.className, `checked=${checked}`).toContain('peer-focus-visible:outline');
      unmount();
    }
  });

  it('marks its box with the stronger border, not the divider colour', () => {
    // `line` is 1.25:1 against the surface. A control whose border is the only
    // thing identifying it needs line-strong to clear SC 1.4.11.
    const { container } = render(Checkbox, { props: { checked: false, label: 'x' } });
    const box = container.querySelector('input + span') as HTMLElement;
    expect(box.className).toContain('border-line-strong');
  });

  // The defect the library keeps reintroducing is a ring written inside a
  // checked ternary, so the state that is meant to be marked is the one state
  // with no marking. Every state is checked, not just the resting one.
  const STATES: { name: string; props: { checked: boolean; indeterminate: boolean } }[] = [
    { name: 'unchecked', props: { checked: false, indeterminate: false } },
    { name: 'checked', props: { checked: true, indeterminate: false } },
    { name: 'mixed', props: { checked: false, indeterminate: true } },
  ];

  it.each(STATES)('states the focus ring once, so it survives the $name state', ({ props }) => {
    const { container } = render(Checkbox, { props: { ...props, label: 'x' } });
    const box = container.querySelector('input + span') as HTMLElement;
    expect(box.className).toContain('peer-focus-visible:outline');
    expect(box.className).toContain('peer-focus-visible:outline-brand');
    expect(box.className).toContain('peer-focus-visible:outline-offset-2');
  });

  it('sets indeterminate as a DOM property, because the attribute does not exist', () => {
    const { container } = render(Checkbox, { props: { indeterminate: true, label: 'All rows' } });
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    expect(input.hasAttribute('indeterminate')).toBe(false);
  });

  it('announces a part-checked box as aria-checked="mixed"', () => {
    const { container, rerender } = render(Checkbox, {
      props: { indeterminate: true, label: 'All rows' },
    });
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.getAttribute('aria-checked')).toBe('mixed');
    // A fully checked box carries no aria-checked at all: the native checked
    // state already says so, and a stale "mixed" would contradict it.
    rerender({ indeterminate: false, checked: true, label: 'All rows' });
    expect(input.hasAttribute('aria-checked')).toBe(false);
  });

  it('paints a mixed box exactly as it paints a checked one', () => {
    // Mixed is a state of being partly on, not a third colour. Only the mark
    // inside the box differs.
    const mixed = render(Checkbox, { props: { indeterminate: true, label: 'x' } });
    const mixedBox = mixed.container.querySelector('input + span') as HTMLElement;
    mixed.unmount();

    const on = render(Checkbox, { props: { checked: true, label: 'x' } });
    const onBox = on.container.querySelector('input + span') as HTMLElement;

    expect(mixedBox.className).toBe(onBox.className);
    expect(onBox.className).toContain('bg-brand');
  });

  it('draws the mixed mark and the check as different SVG paths, never as a glyph', () => {
    const mixed = render(Checkbox, { props: { indeterminate: true, label: 'x' } });
    const mixedPath = mixed.container.querySelector('svg path') as SVGPathElement;
    const mixedBox = mixed.container.querySelector('input + span') as HTMLElement;
    expect(mixedPath.getAttribute('d')).toBe(CHOICE_MARK.mixed);
    // A Unicode minus or check picks up whatever weight the reader's font gives
    // it, which sat visibly lighter than every other icon in the kit.
    expect(/[×−✓ℹ]/.test(mixed.container.innerHTML)).toBe(false);
    expect(mixedBox.textContent?.trim()).toBe('');
    mixed.unmount();

    const on = render(Checkbox, { props: { checked: true, label: 'x' } });
    const checkPath = on.container.querySelector('svg path') as SVGPathElement;
    expect(checkPath.getAttribute('d')).toBe(CHOICE_MARK.check);
    expect(checkPath.getAttribute('d')).not.toBe(mixedPath.getAttribute('d'));
    expect(/[×−✓ℹ]/.test(on.container.innerHTML)).toBe(false);
  });

  it.each(['sm', 'md', 'lg'] as ChoiceSize[])('draws its icon at CHOICE_ICON_PX for %s', (size) => {
    const { container } = render(Checkbox, {
      props: { label: 'Billing', icon: Settings, size },
    });
    // Unchecked, so the only svg on screen is the icon.
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe(String(CHOICE_ICON_PX[size]));
    expect(svg.getAttribute('height')).toBe(String(CHOICE_ICON_PX[size]));
  });

  it('keeps a real label association when the label is hidden', () => {
    // A checkbox in a table cell takes its visible name from the column header,
    // and the row still has to be named for a reader who cannot see the column.
    const { container, getByLabelText } = render(Checkbox, {
      props: { label: 'Select row 3', labelHidden: true },
    });
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(getByLabelText('Select row 3')).toBe(input);
    expect((container.querySelector('[id$="-label"]') as HTMLElement).className).toContain(
      'sr-only',
    );
  });

  it('gives the card variant one focus indicator, not one on the box and one on the card', () => {
    const card = render(Checkbox, { props: { label: 'Pro', variant: 'card' } });
    const targets = ringTargets(card.container);
    expect(targets).toHaveLength(1);
    // The one indicator belongs to the card surface, which is what the input
    // covers, and not to the small box drawn inside it.
    expect(targets[0].className).toContain('rounded-lg');
    card.unmount();

    const inline = render(Checkbox, { props: { label: 'Pro' } });
    expect(ringTargets(inline.container)).toHaveLength(1);
  });

  it('points aria-describedby at the error, then the hint, then the description', () => {
    const all = render(Checkbox, {
      props: {
        id: 'agree',
        label: 'Agree',
        description: 'The short version',
        hint: 'You can change this later',
        error: 'Please accept the terms',
      },
    });
    const input = all.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe('agree-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(all.container.querySelector('#agree-error')?.textContent).toBe(
      'Please accept the terms',
    );
    all.unmount();

    const hinted = render(Checkbox, {
      props: {
        id: 'agree',
        label: 'Agree',
        description: 'The short version',
        hint: 'You can change this later',
      },
    });
    const hintedInput = hinted.container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(hintedInput.getAttribute('aria-describedby')).toBe('agree-hint');
    expect(hintedInput.hasAttribute('aria-invalid')).toBe(false);
    hinted.unmount();

    const described = render(Checkbox, {
      props: { id: 'agree', label: 'Agree', description: 'The short version' },
    });
    const describedInput = described.container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(describedInput.getAttribute('aria-describedby')).toBe('agree-description');
    expect(described.container.querySelector('#agree-description')?.textContent).toBe(
      'The short version',
    );
    described.unmount();

    const bare = render(Checkbox, { props: { id: 'agree', label: 'Agree' } });
    const bareInput = bare.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(bareInput.hasAttribute('aria-describedby')).toBe(false);
  });

  it('blocks the change handler while disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(Checkbox, {
      props: { label: 'Agree', disabled: true, onchange },
    });
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await fireEvent.click(input);
    expect(onchange).not.toHaveBeenCalled();
    // The box is still painted as empty, so the component's own state did not
    // move either.
    expect((container.querySelector('input + span') as HTMLElement).className).toContain(
      'border-line-strong',
    );
  });
});
