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

  /*
   * Off, the track sat in surface-2 with no edge, the same shade as the panel
   * a form sits on, so only the knob showed. The resting border is the one
   * every other control draws; on, the border takes the fill's colour.
   */
  it('draws the off track with the control border and the on track filled', () => {
    const off = render(Toggle, { props: { checked: false } });
    const offTrack = off.container.querySelector('[role="switch"]') as HTMLElement;
    expect(offTrack.className).toContain('border-line-strong');
    expect(offTrack.className).toContain('bg-surface-2');
    expect(offTrack.className).not.toContain('bg-brand');

    const on = render(Toggle, { props: { checked: true } });
    const onTrack = on.container.querySelector('[role="switch"]') as HTMLElement;
    expect(onTrack.className).toContain('bg-brand');
    expect(onTrack.className).toContain('border-brand');
    expect(onTrack.className).not.toContain('border-line-strong');
  });

  it('keeps the knob one step inside the bordered track', () => {
    const { container } = render(Toggle, { props: {} });
    const knob = container.querySelector('[role="switch"] span') as HTMLElement;
    expect(knob.className).toContain('top-px');
    expect(knob.className).toContain('start-px');
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

describe('Toggle in a right-to-left page', () => {
  /*
   * The knob rests at the start of its track and travels to the end. With a
   * physical `left-0.5` it rested on the left in both directions, and the
   * positive translate that moves it would have carried it off a track laid
   * out the other way round.
   */
  it('rests the knob on the start edge and mirrors its travel', () => {
    const { container } = render(Toggle, { props: { checked: true } });
    const knob = container.querySelector('[role="switch"] span') as HTMLElement;
    expect(knob.className).toContain('start-px');
    expect(knob.className).not.toContain('left-px');
    expect(knob.className).toContain('rtl:-translate-x-');
  });
});
