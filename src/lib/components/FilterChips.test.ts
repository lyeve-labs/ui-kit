import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FilterChips from './FilterChips.svelte';

const options = [
  { value: 'all', label: 'All', count: 41 },
  { value: 'API', label: 'API', count: 3 },
  { value: 'Visual Builders', label: 'Visual Builders', count: 2 },
];

describe('FilterChips', () => {
  it('presses exactly the chip that holds the value', () => {
    const { getAllByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'API' },
    });
    const pressed = getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((b) => b.textContent?.replace(/\s+/g, ''))).toEqual(['API3']);
  });

  it('names the group and reads the count with its label', () => {
    const { getByRole, getAllByText } = render(FilterChips, {
      props: { label: 'Category', options, value: 'all', countLabel: 'on sale' },
    });
    expect(getByRole('group', { name: 'Category' })).toBeTruthy();
    expect(getAllByText('on sale', { exact: false, selector: '.sr-only' })).toHaveLength(3);
  });

  it('keeps a long label on one line, so the row wraps between chips and never inside one', () => {
    const { getByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'all' },
    });
    expect(getByRole('button', { name: /Visual Builders/ }).className).toContain(
      'whitespace-nowrap',
    );
  });

  it('reports a new pick and ignores a press on the chip already chosen', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'all', onchange },
    });
    await fireEvent.click(getByRole('button', { name: /^All/ }));
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(getByRole('button', { name: /^API/ }));
    expect(onchange).toHaveBeenCalledWith('API');
  });
});
