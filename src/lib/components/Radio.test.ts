import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Radio from './Radio.svelte';

describe('Radio', () => {
  it('is checked when the group matches its value', () => {
    const { container } = render(Radio, { props: { value: 'a', group: 'a' } });
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).checked).toBe(true);
  });

  it('is unchecked when the group differs', () => {
    const { container } = render(Radio, { props: { value: 'a', group: 'b' } });
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it('renders label and hint', () => {
    const { getByText } = render(Radio, {
      props: { value: 'a', label: 'Option A', hint: 'the first one' },
    });
    expect(getByText('Option A')).toBeTruthy();
    expect(getByText('the first one')).toBeTruthy();
  });

  it('fires onchange with its value when selected', async () => {
    const onchange = vi.fn();
    const { container } = render(Radio, { props: { value: 'a', group: 'b', onchange } });
    await fireEvent.click(container.querySelector('input[type="radio"]') as HTMLInputElement);
    expect(onchange).toHaveBeenCalledWith('a');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Radio, { props: { value: 'a', disabled: true } });
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it('the input covers the painted dot, so a click aimed at it lands on it', () => {
    const { container } = render(Radio, { props: { value: 'a' } });
    const input = container.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.className).not.toContain('sr-only');
    expect(input.className).toContain('absolute');
    expect(input.className).toContain('inset-0');
    expect(input.className).toContain('h-full');
    expect(input.className).toContain('w-full');
    expect((input.nextElementSibling as HTMLElement).className).toContain('pointer-events-none');
  });

  it('keeps a focus indicator after it is selected', () => {
    // Same defect as Checkbox: the ring sat only on the unselected classes.
    for (const group of ['', 'a']) {
      const { container, unmount } = render(Radio, { props: { group, value: 'a', label: 'x' } });
      const dot = container.querySelector('input + span') as HTMLElement;
      expect(dot.className, `group=${group}`).toContain('peer-focus-visible:outline');
      unmount();
    }
  });
});
