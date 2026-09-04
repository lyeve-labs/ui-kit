import { render, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Stat from './Stat.svelte';

describe('Stat', () => {
  it('renders the label and value', () => {
    const { getByText } = render(Stat, { props: { label: 'Revenue', value: '$1,200' } });
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('$1,200')).toBeTruthy();
  });

  it('applies the accent color to the value', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Users', value: 42, accent: 'violet' },
    });
    expect(getByText('42').className).toContain('text-violet');
  });

  it('renders an up trend with its change and success color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Sales', value: 10, trend: 'up', change: '12%' },
    });
    const el = getByText(/12%/);
    expect(el.textContent).toContain('↑');
    expect(el.className).toContain('text-success');
  });

  it('renders a sub label', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Sales', value: 10, sub: 'vs last week' },
    });
    expect(getByText('vs last week')).toBeTruthy();
  });

  it('renders a down trend with danger color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Bounce', value: 42, trend: 'down', change: '5%' },
    });
    const el = getByText(/5%/);
    expect(el.textContent).toContain('↓');
    expect(el.className).toContain('text-danger');
  });

  it('renders a flat trend with muted color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Stable', value: 0, trend: 'flat', change: '0%' },
    });
    const el = getByText(/0%/);
    expect(el.textContent).toContain('→');
    expect(el.className).toContain('text-muted');
  });

  it('applies the neutral accent color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Count', value: 100, accent: 'neutral' },
    });
    expect(getByText('100').className).toContain('text-fg');
  });

  it('applies the success accent color', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Count', value: 100, accent: 'success' },
    });
    expect(getByText('100').className).toContain('text-success');
  });

  it('renders sub without trend', () => {
    const { getByText } = render(Stat, {
      props: { label: 'Test', value: 1, sub: 'sub text' },
    });
    expect(getByText('sub text')).toBeTruthy();
  });

  it('applies the md size by default and sm when requested', () => {
    // The two local Stat snippets this replaces were a bordered card and a bare
    // div at body size. One component now covers both densities.
    const md = render(Stat, { props: { label: 'Users', value: 42 } });
    expect(within(md.container).getByText('42').className).toContain('text-2xl');
    expect(md.container.querySelector('.p-5')).toBeTruthy();

    const sm = render(Stat, { props: { label: 'Users', value: 42, size: 'sm' } });
    expect(within(sm.container).getByText('42').className).toContain('text-lg');
    expect(sm.container.querySelector('.p-4')).toBeTruthy();
  });

  it.each([
    ['neutral', 'text-fg'],
    ['brand', 'text-brand'],
    ['success', 'text-success'],
    ['warn', 'text-warn'],
    ['danger', 'text-danger'],
  ] as const)('colours the value for the %s tone', (tone, expected) => {
    const { getByText } = render(Stat, { props: { label: 'Quota', value: 9, tone } });
    expect(getByText('9').className).toContain(expected);
  });

  it('lets the tone win over the accent', () => {
    // accent is the decorative vocabulary and carries no warn or danger, so a
    // figure that is over its quota had no way to say so.
    const { getByText } = render(Stat, {
      props: { label: 'Quota', value: 9, accent: 'brand', tone: 'danger' },
    });
    expect(getByText('9').className).toContain('text-danger');
    expect(getByText('9').className).not.toContain('text-brand');
  });

  it('keeps the accent when no tone is given', () => {
    const { getByText } = render(Stat, { props: { label: 'Users', value: 7, accent: 'violet' } });
    expect(getByText('7').className).toContain('text-violet');
  });

  it('holds a ticking value on one advance with the mono family and tabular figures', () => {
    // A proportional 1 is narrower than a proportional 0, so a counter shoves
    // its neighbours sideways on nearly every update. Both utilities are needed:
    // the family alone still leaves the digits proportional in some faces.
    const { getByText } = render(Stat, { props: { label: 'Requests', value: 1011, mono: true } });
    expect(getByText('1011').className).toContain('font-mono');
    expect(getByText('1011').className).toContain('tabular-nums');
  });

  it('leaves the value in the body face when mono is not asked for', () => {
    const { getByText } = render(Stat, { props: { label: 'Requests', value: 1011 } });
    expect(getByText('1011').className).not.toContain('font-mono');
    expect(getByText('1011').className).not.toContain('tabular-nums');
  });
});
