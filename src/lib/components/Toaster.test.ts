import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toast } from '../stores/toast.svelte.js';
import Toaster from './Toaster.svelte';

describe('Toaster', () => {
  beforeEach(() => {
    toast.items = [];
  });
  afterEach(() => {
    toast.items = [];
  });

  it('renders a pushed toast message', () => {
    toast.push('info', 'Saved changes', 0);
    const { getByText } = render(Toaster);
    expect(getByText('Saved changes')).toBeTruthy();
  });

  it('applies the tone accent bar', () => {
    toast.push('success', 'Done', 0);
    const { container } = render(Toaster);
    expect(container.querySelector('.bg-success')).toBeTruthy();
  });

  it('removes a toast when its dismiss button is clicked', async () => {
    toast.push('info', 'Dismiss me', 0);
    const { getByLabelText, queryByText } = render(Toaster);
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(queryByText('Dismiss me')).toBeNull();
  });

  it('renders one entry per active toast', () => {
    toast.push('info', 'First', 0);
    toast.push('warn', 'Second', 0);
    // One live region for the app, not one per toast. A region that arrives
    // already holding its text is not a change, so assistive technology never
    // announced it; the container is mounted up front and the toasts land in it.
    const { getByRole } = render(Toaster);
    const live = getByRole('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.querySelectorAll('p')).toHaveLength(2);
  });

  it('applies the danger tone styles', () => {
    toast.push('danger', 'Error occurred', 0);
    const { container } = render(Toaster);
    expect(container.querySelector('.bg-danger')).toBeTruthy();
    expect(container.querySelector('.text-danger')).toBeTruthy();
  });
});
