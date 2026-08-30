import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Checkbox from './Checkbox.svelte';

describe('Checkbox', () => {
  it('renders label and hint', () => {
    const { getByText } = render(Checkbox, {
      props: { label: 'Accept terms', hint: 'Required to continue' },
    });
    expect(getByText('Accept terms')).toBeTruthy();
    expect(getByText('Required to continue')).toBeTruthy();
  });

  it('reflects the checked state and renders the checkmark', () => {
    const { container } = render(Checkbox, { props: { checked: true } });
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows a required marker', () => {
    const { container } = render(Checkbox, { props: { label: 'Agree', required: true } });
    expect(container.querySelector('span[aria-label="required"]')?.textContent).toBe('*');
  });

  it('fires onchange with the new boolean when toggled', async () => {
    const onchange = vi.fn();
    const { container } = render(Checkbox, { props: { checked: false, onchange } });
    await fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);
    expect(onchange).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Checkbox, { props: { disabled: true } });
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it('the input covers the painted box, so a click aimed at it lands on it', () => {
    const { container } = render(Checkbox, { props: { label: 'admin' } });
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    // sr-only leaves the input 1x1 and buried under the box that replaces it,
    // so nothing can click it. It has to cover what the user actually sees.
    expect(input.className).not.toContain('sr-only');
    expect(input.className).toContain('absolute');
    expect(input.className).toContain('inset-0');
    expect(input.className).toContain('h-full');
    expect(input.className).toContain('w-full');
    expect((input.nextElementSibling as HTMLElement).className).toContain('pointer-events-none');
  });
});
