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
});
