import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Toggle from './Toggle.svelte';

describe('Toggle', () => {
  it('renders a switch reflecting the checked state', () => {
    const { container } = render(Toggle, { props: { checked: true } });
    const sw = container.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(sw).toBeTruthy();
    expect(sw.getAttribute('aria-checked')).toBe('true');
  });

  it('renders label and hint', () => {
    const { getByText } = render(Toggle, {
      props: { label: 'Dark mode', hint: 'Applies immediately' },
    });
    expect(getByText('Dark mode')).toBeTruthy();
    expect(getByText('Applies immediately')).toBeTruthy();
  });

  it('applies the md track size by default and sm when requested', () => {
    const md = render(Toggle, { props: {} });
    expect(md.container.querySelector('[role="switch"]')?.className).toContain('w-10');
    const sm = render(Toggle, { props: { size: 'sm' } });
    expect(sm.container.querySelector('[role="switch"]')?.className).toContain('w-8');
  });

  it('fires onchange with the toggled value on click', async () => {
    const onchange = vi.fn();
    const { container } = render(Toggle, { props: { checked: false, onchange } });
    await fireEvent.click(container.querySelector('[role="switch"]') as HTMLButtonElement);
    expect(onchange).toHaveBeenCalledWith(true);
  });

  it('does not fire onchange when disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(Toggle, { props: { disabled: true, onchange } });
    await fireEvent.click(container.querySelector('[role="switch"]') as HTMLButtonElement);
    expect(onchange).not.toHaveBeenCalled();
  });
});
