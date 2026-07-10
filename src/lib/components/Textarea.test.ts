import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Textarea from './Textarea.svelte';

describe('Textarea', () => {
  it('renders the current value as its content', () => {
    const { container } = render(Textarea, { props: { value: 'draft text' } });
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('draft text');
  });

  it('applies the rows attribute', () => {
    const { container } = render(Textarea, { props: { rows: 8 } });
    expect(container.querySelector('textarea')?.getAttribute('rows')).toBe('8');
  });

  it('is resizable by default and fixed when resize=false', () => {
    const resizable = render(Textarea, { props: {} });
    expect(resizable.container.querySelector('textarea')?.className).toContain('resize-y');
    const fixed = render(Textarea, { props: { resize: false } });
    expect(fixed.container.querySelector('textarea')?.className).toContain('resize-none');
  });

  it('fires oninput with the input event when typed into', async () => {
    const oninput = vi.fn();
    const { container } = render(Textarea, { props: { oninput } });
    const ta = container.querySelector('textarea') as HTMLTextAreaElement;
    await fireEvent.input(ta, { target: { value: 'typed' } });
    expect(oninput).toHaveBeenCalledOnce();
  });

  it('shows an error message with the danger border', () => {
    const { container, getByText } = render(Textarea, { props: { error: 'Too short' } });
    expect(getByText('Too short').className).toContain('text-danger');
    expect(container.querySelector('textarea')?.className).toContain('border-danger');
  });

  it('shows a hint', () => {
    const { getByText } = render(Textarea, { props: { hint: 'Markdown allowed' } });
    expect(getByText('Markdown allowed').className).toContain('text-faint');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Textarea, { props: { disabled: true } });
    expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true);
  });
});
