import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import NumberInput from './NumberInput.svelte';

describe('NumberInput', () => {
  it('renders the current value', () => {
    const { container } = render(NumberInput, { props: { value: 7 } });
    expect((container.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('7');
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

  it('shows an error message and border', () => {
    const { container, getByText } = render(NumberInput, { props: { value: 1, error: 'Bad' } });
    expect(getByText('Bad').className).toContain('text-danger');
    expect(container.querySelector('input[type="number"]')?.className).toContain('border-danger');
  });
});
