import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Progress from './Progress.svelte';

describe('Progress', () => {
  it('sets the bar width to the value percentage', () => {
    const { container } = render(Progress, { props: { value: 50, max: 100 } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.style.width).toBe('50%');
  });

  it('exposes aria value attributes', () => {
    const { container } = render(Progress, { props: { value: 30, max: 200 } });
    const track = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(track.getAttribute('aria-valuenow')).toBe('30');
    expect(track.getAttribute('aria-valuemax')).toBe('200');
  });

  it('clamps values above the max to 100%', () => {
    const { container } = render(Progress, { props: { value: 250, max: 100 } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.style.width).toBe('100%');
  });

  it('clamps negative values to 0%', () => {
    const { container } = render(Progress, { props: { value: -20, max: 100 } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('applies the tone class to the bar', () => {
    const { container } = render(Progress, { props: { value: 10, tone: 'danger' } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.className).toContain('bg-danger');
  });

  it('shows the rounded percentage when showValue=true', () => {
    const { getByText } = render(Progress, { props: { value: 33, max: 100, showValue: true } });
    expect(getByText('33%')).toBeTruthy();
  });
});
