import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Tag from './Tag.svelte';

describe('Tag', () => {
  it('renders the label', () => {
    const { getByText } = render(Tag, { props: { label: 'draft' } });
    expect(getByText('draft')).toBeTruthy();
  });

  it('applies the tone class', () => {
    const { container } = render(Tag, { props: { label: 'x', tone: 'brand' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('text-brand');
  });

  it('has no remove button unless removable', () => {
    const { queryByLabelText } = render(Tag, { props: { label: 'x' } });
    expect(queryByLabelText('Remove x')).toBeNull();
  });

  it('fires onremove when the remove button is clicked', async () => {
    const onremove = vi.fn();
    const { getByLabelText } = render(Tag, {
      props: { label: 'x', removable: true, onremove },
    });
    await fireEvent.click(getByLabelText('Remove x'));
    expect(onremove).toHaveBeenCalledOnce();
  });
});
