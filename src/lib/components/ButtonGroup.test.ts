import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import ButtonGroup from './ButtonGroup.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('ButtonGroup', () => {
  it('renders its children', () => {
    const { getByText } = render(ButtonGroup, { props: { children: text('Grouped') } });
    expect(getByText('Grouped')).toBeTruthy();
  });

  it('lays out horizontally by default (no column class)', () => {
    const { container } = render(ButtonGroup, { props: { children: text('x') } });
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain('inline-flex');
    expect(wrap.className).not.toContain('flex-col');
  });

  it('lays out vertically when orientation="vertical"', () => {
    const { container } = render(ButtonGroup, {
      props: { children: text('x'), orientation: 'vertical' },
    });
    expect((container.firstElementChild as HTMLElement).className).toContain('flex-col');
  });
});
