import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  it('states the requirement on a role that supports it', () => {
    // The trigger carried aria-required as a plain button. ARIA 1.2 does not
    // list the property for button, so it was dropped from the accessibility
    // tree and the requirement was announced nowhere: the asterisk is
    // decorative and the picker posts no native input to take `required`.
    // combobox is the role for an input whose popup helps set its value, and it
    // supports aria-required.
    const { container, getByRole } = render(DatePicker, {
      props: { id: 'starts', label: 'Starts', required: true },
    });
    const trigger = getByRole('combobox', { name: 'Starts' }) as HTMLButtonElement;
    expect(trigger.id).toBe('starts');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('leaves no svelte-ignore in the source', () => {
    // The old aria-required sat behind a scoped suppression of the rule that
    // was telling the truth about it.
    const src = readFileSync(join(__dirname, 'DatePicker.svelte'), 'utf8');
    expect(src).not.toMatch(/svelte-ignore/);
  });
});

describe('DatePicker trigger wiring', () => {
  it('names the trigger from the label when the caller passes no id', () => {
    // `id` defaulted to undefined with no fallback, so a standalone picker
    // rendered <label for> pointing at nothing and the trigger was named by its
    // placeholder: the field announced as "Select a date" while the screen read
    // "Starts".
    const { container, getByRole } = render(DatePicker, {
      props: { label: 'Starts', placeholder: 'Select a date' },
    });
    const trigger = getByRole('combobox', { name: 'Starts' }) as HTMLButtonElement;
    expect(trigger.id).not.toBe('');
    expect((container.querySelector('label') as HTMLLabelElement).htmlFor).toBe(trigger.id);
  });

  it('points the hint and the error at the generated id too', () => {
    const { container, getByRole } = render(DatePicker, {
      props: { label: 'Starts', hint: 'Any weekday' },
    });
    const trigger = getByRole('combobox', { name: 'Starts' }) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-describedby')).toBe(`${trigger.id}-hint`);
    expect((container.querySelector('p') as HTMLElement).id).toBe(`${trigger.id}-hint`);
  });

  it('reports its own error, which a plain button could not', () => {
    const { getByRole } = render(DatePicker, { props: { label: 'Starts', error: 'Pick a day' } });
    expect(getByRole('combobox').getAttribute('aria-invalid')).toBe('true');
  });

  it('announces the calendar it opens and names it only while it exists', async () => {
    // aria-haspopup="dialog" is a claim about what opens, so the popup carries
    // role="dialog" and a name of its own. aria-controls is set only while the
    // popup exists: the calendar is rendered on open, so naming it when closed
    // would point a reader at an id that is not in the document.
    const { getByRole, queryByRole } = render(DatePicker, { props: { value: '2024-06-15' } });
    const trigger = getByRole('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(queryByRole('dialog')).toBeNull();

    await fireEvent.click(trigger);
    const calendar = getByRole('dialog', { name: 'Choose date' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(calendar.id);
  });
});
