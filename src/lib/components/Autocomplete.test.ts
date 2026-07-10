import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Autocomplete from './Autocomplete.svelte';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('Autocomplete', () => {
  it('renders a label and a combobox input', () => {
    const { container, getByText } = render(Autocomplete, {
      props: { options, label: 'Fruit' },
    });
    expect(getByText('Fruit')).toBeTruthy();
    expect(container.querySelector('[role="combobox"]')).toBeTruthy();
  });

  it('opens the option list on focus', async () => {
    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    await fireEvent.focus(container.querySelector('[role="combobox"]') as HTMLInputElement);
    expect(getAllByRole('option')).toHaveLength(3);
  });

  it('displays the selected option label in the input', () => {
    const { container } = render(Autocomplete, { props: { options, value: 'b' } });
    expect((container.querySelector('[role="combobox"]') as HTMLInputElement).value).toBe('Beta');
  });

  it('fires onchange with the chosen value when an option is clicked', async () => {
    const onchange = vi.fn();
    const { container, getByText } = render(Autocomplete, { props: { options, onchange } });
    await fireEvent.focus(container.querySelector('[role="combobox"]') as HTMLInputElement);
    await fireEvent.click(getByText('Gamma'));
    expect(onchange).toHaveBeenCalledWith('c');
  });

  it('filters options as the user types', async () => {
    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    const input = container.querySelector('[role="combobox"]') as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'be' } });
    const opts = getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0].textContent).toContain('Beta');
  });

  it('clears the selection via the clear button', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(Autocomplete, { props: { options, value: 'b', onchange } });
    await fireEvent.click(getByLabelText('Clear'));
    expect(onchange).toHaveBeenCalledWith('');
  });
});
