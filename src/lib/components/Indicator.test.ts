import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Indicator from './Indicator.svelte';

describe('Indicator', () => {
  it('applies the tone class to the dot', () => {
    const { container } = render(Indicator, { props: { tone: 'danger' } });
    expect(container.querySelector('.bg-danger')).toBeTruthy();
  });

  it('defaults to the success tone and sm size', () => {
    const { container } = render(Indicator, { props: {} });
    expect(container.querySelector('.bg-success')).toBeTruthy();
    expect(container.querySelector('.w-2')).toBeTruthy();
  });

  it('renders a pinging ring only when pulse=true', () => {
    const off = render(Indicator, { props: {} });
    expect(off.container.querySelector('.animate-ping')).toBeNull();
    const on = render(Indicator, { props: { pulse: true } });
    expect(on.container.querySelector('.animate-ping')).toBeTruthy();
  });
});
