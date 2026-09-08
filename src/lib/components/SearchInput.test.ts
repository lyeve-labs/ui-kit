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

  it('gives the clear button a target that clears 24px', () => {
    // SC 2.5.8 at AA. The button sits inside the field, so the spacing
    // exception cannot apply to it. jsdom lays nothing out, so the box is
    // computed from what the markup states: a 14px glyph inside 6px of padding
    // on each side is 26px square.
    const { getByLabelText } = render(SearchInput, { props: { value: 'x' } });
    const button = getByLabelText('Clear search');
    const glyph = Number(button.querySelector('svg')?.getAttribute('width'));
    expect(button.className).toContain('p-1.5');
    expect(glyph + 2 * 6).toBeGreaterThanOrEqual(24);
  });

  it('keeps the grown target centred on the field', () => {
    // The box is placed from its right edge, so the padding comes back off the
    // horizontal axis alone. A negative top margin would fight the translate
    // that centres it and lift the glyph 6px.
    const { getByLabelText } = render(SearchInput, { props: { value: 'x' } });
    const button = getByLabelText('Clear search');
    expect(button.className).toContain('-mx-1.5');
    expect(button.className).not.toMatch(/-m-1\.5|-my-1\.5|-mt-1\.5/);
  });
});
