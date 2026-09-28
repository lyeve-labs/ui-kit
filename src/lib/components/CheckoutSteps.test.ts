import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CheckoutSteps from './CheckoutSteps.svelte';

const STEPS = ['Choose', 'Account', 'Pay', 'Install'];

describe('CheckoutSteps', () => {
  it('lists every step in order', () => {
    const { getAllByRole } = render(CheckoutSteps, { props: { steps: STEPS, current: 0 } });
    expect(getAllByRole('listitem').map((li) => li.textContent?.trim().replace(/\s+/g, ' '))).toEqual(
      ['1 Choose /', '2 Account /', '3 Pay /', '4 Install'],
    );
  });

  it('marks the step in progress for a reader who cannot see it', () => {
    const { getAllByRole } = render(CheckoutSteps, { props: { steps: STEPS, current: 2 } });
    const current = getAllByRole('listitem').filter((li) => li.getAttribute('aria-current') === 'step');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toContain('Pay');
  });

  it('names the list, since a page can carry more than one', () => {
    const { getByRole } = render(CheckoutSteps, {
      props: { steps: STEPS, current: 0, label: 'Buying a plan' },
    });
    expect(getByRole('navigation', { name: 'Buying a plan' })).toBeTruthy();
  });

  it('draws no separator after the last step', () => {
    const { getAllByRole } = render(CheckoutSteps, { props: { steps: STEPS, current: 0 } });
    expect(getAllByRole('listitem').at(-1)?.textContent).not.toContain('/');
  });
});
