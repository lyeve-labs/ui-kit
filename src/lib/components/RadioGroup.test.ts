import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import RadioGroup from './RadioGroup.svelte';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true },
];

describe('RadioGroup', () => {
  it('renders one radio input per option', () => {
    const { container } = render(RadioGroup, { props: { options } });
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(3);
  });

  it('checks the input matching the current value', () => {
    const { container } = render(RadioGroup, { props: { options, value: 'b' } });
    const inputs = container.querySelectorAll('input[type="radio"]');
    expect((inputs[1] as HTMLInputElement).checked).toBe(true);
    expect((inputs[0] as HTMLInputElement).checked).toBe(false);
  });

  it('renders a legend label', () => {
    const { container, getByText } = render(RadioGroup, {
      props: { options, label: 'Pick a tier' },
    });
    expect(container.querySelector('legend')).toBeTruthy();
    expect(getByText('Pick a tier')).toBeTruthy();
  });

  it('fires onchange with the chosen value', async () => {
    const onchange = vi.fn();
    const { container } = render(RadioGroup, { props: { options, onchange } });
    await fireEvent.click(container.querySelectorAll('input[type="radio"]')[1] as HTMLInputElement);
    expect(onchange).toHaveBeenCalledWith('b');
  });

  it('applies the horizontal orientation class', () => {
    const { container } = render(RadioGroup, {
      props: { options, orientation: 'horizontal' },
    });
    expect(container.querySelector('.flex-row')).toBeTruthy();
  });

  it('shows an error message', () => {
    const { getByText } = render(RadioGroup, { props: { options, error: 'Choose one' } });
    expect(getByText('Choose one').className).toContain('text-danger');
  });

  it('every input covers its painted dot, so a click aimed at it lands on it', () => {
    const { container } = render(RadioGroup, { props: { options } });
    const inputs = Array.from(container.querySelectorAll('input[type="radio"]'));
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input.className).not.toContain('sr-only');
      expect(input.className).toContain('absolute');
      expect(input.className).toContain('inset-0');
      expect(input.className).toContain('h-full');
      expect(input.className).toContain('w-full');
      expect((input.nextElementSibling as HTMLElement).className).toContain('pointer-events-none');
    }
  });
});
