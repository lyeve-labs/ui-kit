import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from './DatePicker.svelte';

describe('DatePicker', () => {
  it('shows the placeholder when no date is selected', () => {
    const { getByText } = render(DatePicker, {
      props: { value: '', placeholder: 'Pick a day' },
    });
    expect(getByText('Pick a day')).toBeTruthy();
  });

  it('formats and displays the selected date', () => {
    const { container } = render(DatePicker, { props: { value: '2024-06-15' } });
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger.textContent).toContain('2024');
    expect(trigger.textContent).toContain('15');
  });

  it('opens a calendar popover when the trigger is clicked', async () => {
    const { container, getByLabelText, getByText } = render(DatePicker, {
      props: { value: '2024-06-15' },
    });
    await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(getByLabelText('Previous month')).toBeTruthy();
    expect(getByText('June 2024')).toBeTruthy();
  });

  it('fires onchange with the ISO date when a day is picked', async () => {
    const onchange = vi.fn();
    const { container, getByLabelText } = render(DatePicker, {
      props: { value: '2024-06-15', onchange },
    });
    await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    await fireEvent.click(getByLabelText('2024-06-10'));
    expect(onchange).toHaveBeenCalledWith('2024-06-10');
  });

  it('does not open when disabled', async () => {
    const { container, queryByLabelText } = render(DatePicker, {
      props: { value: '', disabled: true },
    });
    await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(queryByLabelText('Previous month')).toBeNull();
  });
});
