import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import NumberInput from './NumberInput.svelte';
import { CONTROL_BASE, controlBorder } from '../internal/field.js';

/** The bare divider token, which must never identify a control on its own. */
const WEAK_BORDER = /border-line(?!-strong)/;

function field(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="number"]') as HTMLInputElement;
}

describe('NumberInput', () => {
  it('renders the current value', () => {
    const { container } = render(NumberInput, { props: { value: 7 } });
    expect(field(container).value).toBe('7');
  });

  it('increments by step and fires onchange', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(NumberInput, { props: { value: 5, step: 2, onchange } });
    await fireEvent.click(getByLabelText('Increase'));
    expect(onchange).toHaveBeenCalledWith(7);
  });

  it('decrements by step and fires onchange', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(NumberInput, { props: { value: 5, step: 2, onchange } });
    await fireEvent.click(getByLabelText('Decrease'));
    expect(onchange).toHaveBeenCalledWith(3);
  });

  it('disables the decrease button at the minimum', () => {
    const { getByLabelText } = render(NumberInput, { props: { value: 0, min: 0 } });
    expect((getByLabelText('Decrease') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the increase button at the maximum', () => {
    const { getByLabelText } = render(NumberInput, { props: { value: 10, max: 10 } });
    expect((getByLabelText('Increase') as HTMLButtonElement).disabled).toBe(true);
  });

  it('takes its resting border from the shared field contract', () => {
    // The border used to be hand-spelled here: a `border-line` ternary and a
    // separate `focus:border-brand`, so the one control that did not call
    // controlBorder was also the one that rested two contrast steps below the
    // Input beside it.
    const { container } = render(NumberInput, { props: { value: 1 } });
    for (const token of controlBorder(false).split(' ')) {
      expect(field(container).className).toContain(token);
    }
  });

  it('takes its error border from the shared field contract', () => {
    const { container } = render(NumberInput, { props: { value: 1, error: 'Bad' } });
    for (const token of controlBorder(true).split(' ')) {
      expect(field(container).className).toContain(token);
    }
  });

  it('rests on line-strong, never on the bare divider colour', () => {
    // line reads 1.25:1 and fails SC 1.4.11 wherever the border is the only
    // thing identifying the control.
    const { container, getByLabelText } = render(NumberInput, { props: { value: 1 } });
    expect(field(container).className).not.toMatch(WEAK_BORDER);
    expect(getByLabelText('Decrease').className).toContain('border-line-strong');
    expect(getByLabelText('Decrease').className).not.toMatch(WEAK_BORDER);
    expect(getByLabelText('Increase').className).not.toMatch(WEAK_BORDER);
  });

  it('never states a focus border at reduced alpha', () => {
    const { container } = render(NumberInput, { props: { value: 1, error: 'Bad' } });
    expect(field(container).className).not.toMatch(/focus:border-[a-z-]+\//);
  });

  it('states one duration for the colour transition it declares', () => {
    const { container, getByLabelText } = render(NumberInput, { props: { value: 1 } });
    for (const el of [field(container), getByLabelText('Decrease'), getByLabelText('Increase')]) {
      expect(el.className).toMatch(/transition-colors duration-150/);
    }
  });

  it('keeps the control height a token rather than a literal', () => {
    // A 36px NumberInput beside a 38px Input is what the token was added for.
    expect(CONTROL_BASE).toContain('h-control');
    const { container } = render(NumberInput, { props: { value: 1 } });
    expect(field(container).closest('div')?.className).toContain('h-control');
  });

  it('shows an error message and marks the control invalid', () => {
    const { container, getByText } = render(NumberInput, { props: { value: 1, error: 'Bad' } });
    expect(getByText('Bad').className).toContain('text-danger');
    expect(field(container).getAttribute('aria-invalid')).toBe('true');
  });

  it('points aria-describedby at the error that is on screen', () => {
    const { container, getByText } = render(NumberInput, {
      props: { value: 1, id: 'qty', error: 'Bad' },
    });
    expect(field(container).getAttribute('aria-describedby')).toBe('qty-error');
    expect(getByText('Bad').id).toBe('qty-error');
  });

  it('points aria-describedby at the hint when there is no error', () => {
    const { container, getByText } = render(NumberInput, {
      props: { value: 1, id: 'qty', hint: 'Whole numbers' },
    });
    expect(field(container).getAttribute('aria-describedby')).toBe('qty-hint');
    expect(getByText('Whole numbers').id).toBe('qty-hint');
  });

  it('shows the error instead of the hint, never both', () => {
    const { getByText, queryByText } = render(NumberInput, {
      props: { value: 1, error: 'Bad', hint: 'Whole numbers' },
    });
    expect(getByText('Bad')).toBeTruthy();
    expect(queryByText('Whole numbers')).toBeNull();
  });

  it('gives the stepper buttons a spoken name and hides their icons', () => {
    const { container, getByLabelText } = render(NumberInput, { props: { value: 1 } });
    expect(getByLabelText('Decrease').tagName).toBe('BUTTON');
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
