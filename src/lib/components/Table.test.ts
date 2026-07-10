import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Table from './Table.svelte';

const body = createRawSnippet(() => ({
  render: () => '<tbody><tr><td>Cell</td></tr></tbody>',
}));

describe('Table', () => {
  it('renders its children inside a table', () => {
    const { container, getByText } = render(Table, { props: { children: body } });
    expect(container.querySelector('table')).toBeTruthy();
    expect(getByText('Cell')).toBeTruthy();
  });

  it('adds the fixed layout class when fixed=true', () => {
    const { container } = render(Table, { props: { children: body, fixed: true } });
    expect(container.querySelector('table')?.className).toContain('table-fixed');
  });

  it('adds striped-row styling when striped=true', () => {
    const { container } = render(Table, { props: { children: body, striped: true } });
    expect(container.querySelector('table')?.className).toContain('nth-child(even)');
  });

  it('is hoverable by default', () => {
    const { container } = render(Table, { props: { children: body } });
    expect(container.querySelector('table')?.className).toContain('tr:hover');
  });
});
