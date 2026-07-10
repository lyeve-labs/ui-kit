import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SearchInput from './SearchInput.svelte';

describe('SearchInput', () => {
  it('uses a default placeholder', () => {
    const { container } = render(SearchInput, { props: {} });
    expect(container.querySelector('input')?.getAttribute('placeholder')).toBe('Search…');
  });

  it('renders the current value', () => {
    const { container } = render(SearchInput, { props: { value: 'query' } });
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('query');
  });

  it('fires oninput with the typed value', async () => {
    const oninput = vi.fn();
    const { container } = render(SearchInput, { props: { oninput } });
    await fireEvent.input(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'abc' },
    });
    expect(oninput).toHaveBeenCalledWith('abc');
  });

  it('shows a clear button only when a value is present', () => {
    const empty = render(SearchInput, { props: { value: '' } });
    expect(empty.queryByLabelText('Clear search')).toBeNull();
    const filled = render(SearchInput, { props: { value: 'x' } });
    expect(filled.queryByLabelText('Clear search')).toBeTruthy();
  });

  it('clears the value via the clear button', async () => {
    const oninput = vi.fn();
    const { getByLabelText } = render(SearchInput, { props: { value: 'x', oninput } });
    await fireEvent.click(getByLabelText('Clear search'));
    expect(oninput).toHaveBeenCalledWith('');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(SearchInput, { props: { disabled: true } });
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});
