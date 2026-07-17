import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Stat from './Stat.svelte';

describe('Stat', () => {
  it('renders the label and value', () => {
    const { getByText } = render(Stat, { props: { label: 'Revenue', value: '$1,200' } });
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('$1,200')).toBeTruthy();
  });

  it('applies the accent color to the value', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Users', value: 42, accent: 'violet' },
    });
    expect(getByText('42').className).toContain('text-violet');
  });

  it('renders an up trend with its change and success color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Sales', value: 10, trend: 'up', change: '12%' },
    });
    const el = getByText(/12%/);
    expect(el.textContent).toContain('↑');
    expect(el.className).toContain('text-success');
  });

  it('renders a sub label', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Sales', value: 10, sub: 'vs last week' },
    });
    expect(getByText('vs last week')).toBeTruthy();
  });

  it('renders a down trend with danger color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Bounce', value: 42, trend: 'down', change: '5%' },
    });
    const el = getByText(/5%/);
    expect(el.textContent).toContain('↓');
    expect(el.className).toContain('text-danger');
  });

  it('renders a flat trend with muted color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Stable', value: 0, trend: 'flat', change: '0%' },
    });
    const el = getByText(/0%/);
    expect(el.textContent).toContain('→');
    expect(el.className).toContain('text-muted');
  });

  it('applies the neutral accent color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Count', value: 100, accent: 'neutral' },
    });
    expect(getByText('100').className).toContain('text-fg');
  });

  it('applies the success accent color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Count', value: 100, accent: 'success' },
    });
    expect(getByText('100').className).toContain('text-success');
  });

  it('renders sub without trend', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Test', value: 1, sub: 'sub text' },
    });
    expect(getByText('sub text')).toBeTruthy();
  });
});
