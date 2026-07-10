import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Skeleton from './Skeleton.svelte';

describe('Skeleton', () => {
  it('renders a pulsing placeholder', () => {
    const { container } = render(Skeleton, { props: {} });
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('rounded-md');
  });

  it('applies width and height styles', () => {
    const { container } = render(Skeleton, { props: { width: '200px', height: '2rem' } });
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('2rem');
  });

  it('honors a custom rounded class', () => {
    const { container } = render(Skeleton, { props: { rounded: 'rounded-full' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('rounded-full');
  });
});
