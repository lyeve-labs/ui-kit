import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Select from './Select.svelte';

const options = createRawSnippet(() => ({
  render: () => '<optgroup><option value="a">A</option><option value="b">B</option></optgroup>',
}));

describe('Select', () => {
  it('renders its option children', () => {
    const { getByText } = render(Select, { props: { children: options } });
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
  });

  it('reflects the selected value', () => {
    const { container } = render(Select, { props: { children: options, value: 'b' } });
    expect((container.querySelector('select') as HTMLSelectElement).value).toBe('b');
  });

  it('fires onchange when the selection changes', async () => {
    const onchange = vi.fn();
    const { container } = render(Select, { props: { children: options, value: 'a', onchange } });
    await fireEvent.change(container.querySelector('select') as HTMLSelectElement, {
      target: { value: 'b' },
    });
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('shows an error message and the danger border', () => {
    const { container, getByText } = render(Select, {
      props: { children: options, error: 'Pick one' },
    });
    expect(getByText('Pick one').className).toContain('text-danger');
    expect(container.querySelector('select')?.className).toContain('border-danger');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Select, { props: { children: options, disabled: true } });
    expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });
});
