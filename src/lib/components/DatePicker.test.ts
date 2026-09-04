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

describe('DatePicker required marker', () => {
  it('states the requirement on the trigger, not in its accessible name', () => {
    // The marker carried aria-label="required" inside the label, and a label
    // names the button it points at, so the field announced as "Starts
    // required". The trigger posts no value of its own, so aria-required is
    // what it can carry. An id is passed because the label's `for` needs one.
    const { container, getByRole } = render(DatePicker, {
      props: { id: 'starts', label: 'Starts', required: true },
    });
    expect(getByRole('button', { name: 'Starts' })).toBeTruthy();
    const trigger = container.querySelector('button#starts') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });
});
