import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import SectionHeading from './SectionHeading.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('SectionHeading', () => {
  it('renders level 2 as a real h2 by default', () => {
    // Several of the fourteen spellings this replaces were a styled div, which
    // no heading query and no screen reader heading list can find.
    const { container, getByRole } = render(SectionHeading, {
      props: { children: text('Members') },
    });
    const heading = container.querySelector('h2') as HTMLElement;
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Members');
    expect(getByRole('heading', { level: 2 })).toBe(heading);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('renders the requested level as a real h3', () => {
    const { container, getByRole } = render(SectionHeading, {
      props: { level: 3, children: text('Tokens') },
    });
    const heading = container.querySelector('h3') as HTMLElement;
    expect(heading).toBeTruthy();
    expect(getByRole('heading', { level: 3 })).toBe(heading);
    expect(container.querySelector('h2')).toBeNull();
  });

  it('gives each level its own type treatment, from the shared contract', () => {
    // Two sections on one page rendered at different sizes and weights because
    // the class was written out at each site. It comes from the level now.
    const two = render(SectionHeading, { props: { children: text('a') } });
    const three = render(SectionHeading, { props: { level: 3, children: text('b') } });
    const h2 = two.container.querySelector('h2') as HTMLElement;
    const h3 = three.container.querySelector('h3') as HTMLElement;
    expect(h2.className).toContain('text-h3');
    expect(h3.className).toContain('text-sm');
    expect(h2.className).not.toBe(h3.className);
    expect(h2.className).toContain('font-semibold');
    expect(h3.className).toContain('font-semibold');
  });

  it('renders an actions snippet beside the heading', () => {
    const { container, getByText } = render(SectionHeading, {
      props: { children: text('Members'), actions: text('Add') },
    });
    const heading = container.querySelector('h2') as HTMLElement;
    const action = getByText('Add');
    expect(heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('renders no actions row when there are no actions', () => {
    const { container } = render(SectionHeading, { props: { children: text('Members') } });
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(1);
  });

  it('accepts a consumer class on the row', () => {
    const { container } = render(SectionHeading, {
      props: { children: text('Members'), class: 'pt-2' },
    });
    expect((container.firstElementChild as HTMLElement).className).toContain('pt-2');
  });
});

describe('SectionHeading eyebrow', () => {
  it('reads the same at both levels', () => {
    // An eyebrow labels the band under it rather than titling it, so it does
    // not take the level's size. The level still decides the element.
    const two = render(SectionHeading, {
      props: { level: 2, variant: 'eyebrow', children: text('Revenue') },
    });
    const three = render(SectionHeading, {
      props: { level: 3, variant: 'eyebrow', children: text('Revenue') },
    });
    const h2 = two.container.querySelector('h2')!;
    const h3 = three.container.querySelector('h3')!;
    expect(h2.className).toBe(h3.className);
    expect(h2.className).toContain('uppercase');
  });

  it('carries no margin of its own', () => {
    // Thirty of these shipped hand rolled across two apps in four different
    // bottom margins. The stack around the heading owns the distance to what
    // follows, so the heading must not add one.
    const { container } = render(SectionHeading, {
      props: { variant: 'eyebrow', children: text('Revenue') },
    });
    expect(container.querySelector('h2')!.className).not.toMatch(/\bm[bt]?-\d/);
  });

  it('defaults to the title treatment', () => {
    const { container } = render(SectionHeading, { props: { children: text('Revenue') } });
    expect(container.querySelector('h2')!.className).toContain('text-h3');
  });

  it('sizes the title from the brand ramp and not from a Tailwind step', () => {
    // The ramp shipped as eighteen tokens nothing referenced, so every heading
    // in the estate rendered at whichever Tailwind step someone reached for.
    // A --text-* token carries no line-height and no tracking of its own, so
    // adopting the size alone leaves a 22px heading leading at whatever it
    // inherited: all three have to be named together or the ramp is a third
    // adopted.
    const { container } = render(SectionHeading, { props: { children: text('Revenue') } });
    const cls = container.querySelector('h2')!.className;
    expect(cls).toContain('text-h3');
    expect(cls).toContain('leading-h3');
    expect(cls).toContain('tracking-h3');
    expect(cls).not.toMatch(/\btext-(xs|sm|base|lg|xl|\dxl)\b/);
  });
});
