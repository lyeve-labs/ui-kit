import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MultiSelect from './MultiSelect.svelte';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('MultiSelect', () => {
  it('shows the placeholder when nothing is selected', () => {
    const { getByText } = render(MultiSelect, {
      props: { options, value: [], placeholder: 'Choose tags' },
    });
    expect(getByText('Choose tags')).toBeTruthy();
  });

  it('opens the option list when the trigger is clicked', async () => {
    const { container, getAllByRole } = render(MultiSelect, { props: { options, value: [] } });
    await fireEvent.click(container.querySelector('[role="button"]') as HTMLElement);
    expect(getAllByRole('option')).toHaveLength(3);
  });

  it('fires onchange adding the toggled value', async () => {
    const onchange = vi.fn();
    const { container, getByText } = render(MultiSelect, {
      props: { options, value: [], onchange },
    });
    await fireEvent.click(container.querySelector('[role="button"]') as HTMLElement);
    await fireEvent.click(getByText('Alpha'));
    expect(onchange).toHaveBeenCalledWith(['a']);
  });

  it('renders a removable chip for each selected value', () => {
    const { getByLabelText } = render(MultiSelect, { props: { options, value: ['a'] } });
    expect(getByLabelText('Remove Alpha')).toBeTruthy();
  });

  it('fires onchange removing a value via its chip', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(MultiSelect, {
      props: { options, value: ['a', 'b'], onchange },
    });
    await fireEvent.click(getByLabelText('Remove Alpha'));
    expect(onchange).toHaveBeenCalledWith(['b']);
  });
});
