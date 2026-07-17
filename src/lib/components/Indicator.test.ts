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

  it('applies the warn tone', () => {
    const { container } = render(Indicator, { props: { tone: 'warn' } });
    expect(container.querySelector('.bg-warn')).toBeTruthy();
  });

  it('applies the brand tone', () => {
    const { container } = render(Indicator, { props: { tone: 'brand' } });
    expect(container.querySelector('.bg-brand')).toBeTruthy();
  });

  it('applies the violet tone', () => {
    const { container } = render(Indicator, { props: { tone: 'violet' } });
    expect(container.querySelector('.bg-violet')).toBeTruthy();
  });

  it('applies the neutral tone', () => {
    const { container } = render(Indicator, { props: { tone: 'neutral' } });
    expect(container.querySelector('.bg-muted')).toBeTruthy();
  });

  it('applies xs size class', () => {
    const { container } = render(Indicator, { props: { size: 'xs' } });
    expect(container.querySelector('.w-1\\.5')).toBeTruthy();
  });

  it('applies md size class', () => {
    const { container } = render(Indicator, { props: { size: 'md' } });
    expect(container.querySelector('.w-2\\.5')).toBeTruthy();
  });

  it('applies lg size class', () => {
    const { container } = render(Indicator, { props: { size: 'lg' } });
    expect(container.querySelector('.w-3\\.5')).toBeTruthy();
  });
});
