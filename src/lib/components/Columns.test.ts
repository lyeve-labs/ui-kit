import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Columns from './Columns.svelte';

const three = createRawSnippet(() => ({
  render: () => '<div><p>One</p><p>Two</p><p>Three</p></div>',
}));

describe('Columns', () => {
  it('stacks a column that would fall under the site minimum, with no breakpoint', () => {
    const { container } = render(Columns, { props: { children: three } });
    const grid = container.querySelector('.grid')!;
    expect(grid.className).toContain('var(--spacing-column-min)');
    expect(grid.className).toMatch(/\bgap-gutter\b/);
    expect(grid.className).not.toMatch(/\b(sm|md|lg|xl):/);
  });

  it.each([2, 3, 4] as const)('caps a row at %i columns by their share of it', (max) => {
    const { container } = render(Columns, { props: { max, children: three } });
    expect(container.querySelector('.grid')!.className).toContain(`)/${max})`);
  });
});
