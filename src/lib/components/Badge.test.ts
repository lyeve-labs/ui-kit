import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.svelte';

// Svelte 5 snippet helper: wrap plain text as a `children` snippet.
const text = (s: string) =>
  createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Badge', () => {
  it('renders its children', () => {
    const { getByText } = render(Badge, { props: { children: text('NEW') } });
    expect(getByText('NEW')).toBeTruthy();
  });

  it('applies the tone class', () => {
    const { container } = render(Badge, {
      props: { children: text('x'), tone: 'brand' },
    });
    expect(container.querySelector('.text-brand')).toBeTruthy();
  });

  it('renders the dot when dot=true', () => {
    const { container } = render(Badge, {
      props: { children: text('x'), tone: 'success', dot: true },
    });
    expect(container.querySelector('.bg-success')).toBeTruthy();
  });
});
