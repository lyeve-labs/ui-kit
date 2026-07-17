import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Tag from './Tag.svelte';

describe('Tag', () => {
  it('renders the label', () => {
    const { getByText } = render(Tag, { props: { label: 'draft' } });
    expect(getByText('draft')).toBeTruthy();
  });

  it('applies neutral tone by default', () => {
    const { container } = render(Tag, { props: { label: 'x' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-surface-2');
  });

  it('applies the brand tone class', () => {
    const { container } = render(Tag, { props: { label: 'x', tone: 'brand' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('text-brand');
  });

  it('applies the violet tone', () => {
    const { container } = render(Tag, { props: { label: 'x', tone: 'violet' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('text-violet');
  });

  it('applies the success tone', () => {
    const { container } = render(Tag, { props: { label: 'x', tone: 'success' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('text-success');
  });

  it('applies the warn tone', () => {
    const { container } = render(Tag, { props: { label: 'x', tone: 'warn' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('text-warn');
  });

  it('applies the danger tone', () => {
    const { container } = render(Tag, { props: { label: 'x', tone: 'danger' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('text-danger');
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
