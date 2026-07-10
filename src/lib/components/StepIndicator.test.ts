import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StepIndicator from './StepIndicator.svelte';

const steps = [{ label: 'Account' }, { label: 'Profile' }, { label: 'Confirm' }];

describe('StepIndicator', () => {
  it('renders each step label', () => {
    const { getByText } = render(StepIndicator, { props: { steps, current: 2 } });
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('renders a checkmark for completed steps instead of the number', () => {
    const { container, queryByText } = render(StepIndicator, { props: { steps, current: 2 } });
    // Step 1 is complete (current=2) so its "1" is replaced by a check svg.
    expect(queryByText('1')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders the number for the active and upcoming steps', () => {
    const { getByText } = render(StepIndicator, { props: { steps, current: 2 } });
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('labels the nav for accessibility', () => {
    const { container } = render(StepIndicator, { props: { steps, current: 1 } });
    expect(container.querySelector('nav[aria-label="Progress"]')).toBeTruthy();
  });
});
