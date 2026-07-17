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

  it('shows hint text when no error', () => {
    const { getByText } = render(FileInput, { props: { hint: 'Max 5MB' } });
    const hint = getByText('Max 5MB');
    expect(hint.className).toContain('text-faint');
  });

  it('shows error instead of hint when both are set', () => {
    const { getByText, queryByText } = render(FileInput, {
      props: { error: 'Too big', hint: 'Max 5MB' },
    });
    expect(getByText('Too big')).toBeTruthy();
    expect(queryByText('Max 5MB')).toBeNull();
  });

  it('shows drag-over styling when dragging over the drop zone', async () => {
    const { container } = render(FileInput, { props: {} });
    const label = container.querySelector('label');
    expect(label).toBeTruthy();

    // Initially should have border-line, not the drag-over brand bg
    const classBefore = label!.className;
    expect(classBefore).toContain('border-line');
    expect(classBefore).not.toContain('bg-brand/8');

    // Simulate dragover
    await fireEvent.dragOver(label!);
    const classDuring = label!.className;
    expect(classDuring).toContain('bg-brand/8');
    expect(classDuring).toContain('border-brand');

    // Simulate dragleave
    await fireEvent.dragLeave(label!);
    const classAfter = label!.className;
    expect(classAfter).not.toContain('bg-brand/8');
    expect(classAfter).toContain('border-line');
  });

  it('calls onchange with dropped files on drop', async () => {
    const onchange = vi.fn();
    const { container } = render(FileInput, { props: { onchange } });
    const label = container.querySelector('label') as HTMLElement;

    await fireEvent.dragOver(label);
    expect(label.className).toContain('bg-brand/8');

    // Drop event doesn't carry FileList in jsdom, so onchange
    // will receive null from e.dataTransfer?.files
    await fireEvent.drop(label);
    expect(onchange).toHaveBeenCalled();

    // After drop, dragOver should reset
    expect(label.className).not.toContain('bg-brand/8');
  });

  it('does not fire onchange on drop when disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(FileInput, { props: { disabled: true, onchange } });
    const label = container.querySelector('label') as HTMLElement;

    // Dragover still shows visual feedback but drop does nothing
    await fireEvent.dragOver(label);
    // Disabled has cursor-not-allowed and opacity-50 class
    expect(label.className).toContain('cursor-not-allowed');

    await fireEvent.drop(label);
    // onchange should not be called because disabled check
    expect(onchange).not.toHaveBeenCalled();
  });
});
