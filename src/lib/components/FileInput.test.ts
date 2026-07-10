import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FileInput from './FileInput.svelte';

describe('FileInput', () => {
  it('renders the upload prompt', () => {
    const { getByText } = render(FileInput, { props: {} });
    expect(getByText('Click to upload')).toBeTruthy();
  });

  it('renders a label and the accepted types', () => {
    const { getByText } = render(FileInput, {
      props: { label: 'Avatar', accept: 'image/png' },
    });
    expect(getByText('Avatar')).toBeTruthy();
    expect(getByText('image/png')).toBeTruthy();
  });

  it('forwards the file input type and accept to the input', () => {
    const { container } = render(FileInput, { props: { accept: '.pdf', multiple: true } });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe('.pdf');
    expect(input.multiple).toBe(true);
  });

  it('fires onchange when the file input changes', async () => {
    const onchange = vi.fn();
    const { container } = render(FileInput, { props: { onchange } });
    await fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement);
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('shows an error message with danger styling', () => {
    const { container, getByText } = render(FileInput, { props: { error: 'Too big' } });
    expect(getByText('Too big').className).toContain('text-danger');
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-danger');
  });

  it('disables the file input when disabled=true', () => {
    const { container } = render(FileInput, { props: { disabled: true } });
    expect((container.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
  });
});
