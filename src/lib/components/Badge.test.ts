import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Badge', () => {
  it('renders its children', () => {
    const { getByText } = render(Badge, { props: { children: text('NEW') } });
    expect(getByText('NEW')).toBeTruthy();
  });

  it('applies the neutral tone class by default', () => {
    const { container } = render(Badge, { props: { children: text('x') } });
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-surface-2');
  });

  it('applies the brand tone class', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'brand' } });
    expect(container.querySelector('.text-brand')).toBeTruthy();
  });

  it('applies the violet tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'violet' } });
    expect(container.querySelector('.text-violet')).toBeTruthy();
  });

  it('applies the success tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'success' } });
    expect(container.querySelector('.text-success')).toBeTruthy();
  });

  it('applies the warn tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'warn' } });
    expect(container.querySelector('.text-warn')).toBeTruthy();
  });

  it('applies the danger tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'danger' } });
    expect(container.querySelector('.text-danger')).toBeTruthy();
  });

  it('applies sm size class by default', () => {
    const { container } = render(Badge, { props: { children: text('x') } });
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('text-xs');
  });

  it('applies md size class when size="md"', () => {
    const { container } = render(Badge, { props: { children: text('x'), size: 'md' } });
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('text-sm');
  });

  it('renders a dot with matching tone color', () => {
    const { container } = render(Badge, {
      props: { children: text('x'), tone: 'success', dot: true },
    });
    expect(container.querySelector('.bg-success')).toBeTruthy();
    expect(container.querySelector('.w-1\\.5')).toBeTruthy();
  });

  it('renders danger dot with correct color', () => {
    const { container } = render(Badge, {
      props: { children: text('x'), tone: 'danger', dot: true },
    });
    expect(container.querySelector('.bg-danger')).toBeTruthy();
  });

  it('does not render a dot by default', () => {
    const { container } = render(Badge, { props: { children: text('x') } });
    expect(container.querySelector('.w-1\\.5')).toBeNull();
  });
});
