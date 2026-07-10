import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Spinner from './Spinner.svelte';

describe('Spinner', () => {
  it('renders a spinning svg', () => {
    const { container } = render(Spinner, { props: {} });
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('class')).toContain('animate-spin');
  });

  it('defaults to a size of 16', () => {
    const { container } = render(Spinner, { props: {} });
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
  });

  it('honors a custom size', () => {
    const { container } = render(Spinner, { props: { size: 24 } });
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24');
  });

  it('merges an extra class', () => {
    const { container } = render(Spinner, { props: { class: 'text-brand' } });
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-brand');
  });
});
