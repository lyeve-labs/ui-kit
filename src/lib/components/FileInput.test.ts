import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FileInput from './FileInput.svelte';

/** The bare divider token, which must never identify a control on its own. */
const WEAK_BORDER = /border-line(?!-strong)/;

/** The dashed drop target, which is the first label only when there is no field label. */
function dropzone(container: HTMLElement): HTMLElement {
  const labels = [...container.querySelectorAll<HTMLElement>('label')];
  return labels[labels.length - 1];
}

function input(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

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
    const label = dropzone(container);

    const classBefore = label.className;
    expect(classBefore).toContain('border-line-strong');
    expect(classBefore).not.toContain('bg-brand/8');

    await fireEvent.dragOver(label);
    const classDuring = label.className;
    expect(classDuring).toContain('bg-brand/8');
    expect(classDuring).toContain('border-brand');

    await fireEvent.dragLeave(label);
    const classAfter = label.className;
    expect(classAfter).not.toContain('bg-brand/8');
    expect(classAfter).toContain('border-line-strong');
  });

  it('rests the dropzone on line-strong, never on the bare divider colour', () => {
    // The dashed border is the only thing identifying this region as a control,
    // and line reads 1.25:1, so at rest it failed SC 1.4.11.
    const { container } = render(FileInput, { props: {} });
    expect(dropzone(container).className).toContain('border-line-strong');
    expect(dropzone(container).className).not.toMatch(WEAK_BORDER);
  });

  it('hovers to full-strength brand, never a focus colour at reduced alpha', () => {
    // border-brand/50 read as a weaker affordance for no reason a user could
    // infer, and half-alpha brand does not clear the 3:1 boundary floor.
    const { container } = render(FileInput, { props: {} });
    const cls = dropzone(container).className;
    expect(cls).toContain('hover:border-brand');
    expect(cls).not.toMatch(/border-brand\//);
  });

  it('keeps the dropzone border stated once per state', () => {
    // Error, drag-over and rest are one ternary, so no two border colours can
    // land on the element at once and resolve by emitted order.
    const { container } = render(FileInput, { props: { error: 'Too big' } });
    const cls = dropzone(container).className;
    expect(cls).toContain('border-danger');
    expect(cls).not.toContain('border-line-strong');
  });

  it('points aria-describedby at whichever message is on screen', () => {
    const withError = render(FileInput, { props: { id: 'doc', error: 'Too big' } });
    expect(input(withError.container).getAttribute('aria-describedby')).toBe('doc-error');
    expect(input(withError.container).getAttribute('aria-invalid')).toBe('true');

    const withHint = render(FileInput, { props: { id: 'doc2', hint: 'Max 5MB' } });
    expect(input(withHint.container).getAttribute('aria-describedby')).toBe('doc2-hint');
    expect(input(withHint.container).getAttribute('aria-invalid')).toBeNull();
  });

  it('names one duration for the colour transition it declares', () => {
    const { container } = render(FileInput, { props: {} });
    expect(dropzone(container).className).toMatch(/transition-colors duration-150/);
  });

  it('calls onchange with dropped files on drop', async () => {
    const onchange = vi.fn();
    const { container } = render(FileInput, { props: { onchange } });
    const label = dropzone(container);

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
    const label = dropzone(container);

    // Dragover still shows visual feedback but drop does nothing
    await fireEvent.dragOver(label);
    // Disabled has cursor-not-allowed and opacity-50 class
    expect(label.className).toContain('cursor-not-allowed');

    await fireEvent.drop(label);
    // onchange should not be called because disabled check
    expect(onchange).not.toHaveBeenCalled();
  });
});
