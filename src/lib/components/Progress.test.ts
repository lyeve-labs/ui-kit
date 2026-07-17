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

  it('renders a label above the bar', () => {
    const { getByText } = render(Progress, { props: { value: 50, label: 'Uploading' } });
    expect(getByText('Uploading')).toBeTruthy();
  });

  it('applies the violet tone class', () => {
    const { container } = render(Progress, { props: { value: 10, tone: 'violet' } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.className).toContain('bg-violet');
  });

  it('applies the success tone class', () => {
    const { container } = render(Progress, { props: { value: 10, tone: 'success' } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.className).toContain('bg-success');
  });

  it('applies the warn tone class', () => {
    const { container } = render(Progress, { props: { value: 10, tone: 'warn' } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.className).toContain('bg-warn');
  });

  it('applies xs size class', () => {
    const { container } = render(Progress, { props: { value: 10, size: 'xs' } });
    const track = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(track.className).toContain('h-1');
    expect(track.className).not.toContain('h-1.5');
    expect(track.className).not.toContain('h-2.5');
  });

  it('applies md size class', () => {
    const { container } = render(Progress, { props: { value: 10, size: 'md' } });
    const track = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(track.className).toContain('h-2.5');
  });

  it('adds animate-pulse when animated=true', () => {
    const { container } = render(Progress, { props: { value: 50, animated: true } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.className).toContain('animate-pulse');
  });

  it('does not add animate-pulse by default', () => {
    const { container } = render(Progress, { props: { value: 50 } });
    const bar = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(bar.className).not.toContain('animate-pulse');
  });
});
