import { render } from '@testing-library/svelte';
import { Settings } from '@lucide/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Panel from './Panel.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;

const classesOf = (el: HTMLElement) => el.className.split(/\s+/).filter(Boolean);

describe('Panel', () => {
  it('renders its children', () => {
    const { getByText } = render(Panel, { props: { children: text('Body') } });
    expect(getByText('Body')).toBeTruthy();
  });

  it('renders a real heading at the default level', () => {
    // A styled div appears in no heading list, and a page outline is what a
    // screen reader navigates by. Level 3 is the default because a panel sits
    // inside a page that already has its title.
    const { container, getByRole } = render(Panel, {
      props: { heading: 'Retention', children: text('Body') },
    });
    const h3 = container.querySelector('h3') as HTMLElement;
    expect(h3).toBeTruthy();
    expect(h3.textContent?.trim()).toBe('Retention');
    expect(getByRole('heading', { level: 3 })).toBe(h3);
    expect(container.querySelector('h2')).toBeNull();
  });

  it('renders a real heading at the requested level', () => {
    const { container, getByRole } = render(Panel, {
      props: { heading: 'Retention', headingLevel: 2, children: text('Body') },
    });
    const h2 = container.querySelector('h2') as HTMLElement;
    expect(h2).toBeTruthy();
    expect(getByRole('heading', { level: 2 })).toBe(h2);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('takes its type treatment from the level, not from the call site', () => {
    const two = render(Panel, {
      props: { heading: 'a', headingLevel: 2, children: text('Body') },
    });
    const three = render(Panel, { props: { heading: 'b', children: text('Body') } });
    const h2 = two.container.querySelector('h2') as HTMLElement;
    const h3 = three.container.querySelector('h3') as HTMLElement;
    expect(h2.className).toContain('text-lg');
    expect(h3.className).toContain('text-sm');
    expect(h2.className).toContain('font-semibold');
    expect(h3.className).toContain('font-semibold');
  });

  it('renders no heading element when heading is unset', () => {
    // An unlabelled group must not put an empty entry in the page outline.
    const { container, queryAllByRole } = render(Panel, { props: { children: text('Body') } });
    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(queryAllByRole('heading')).toHaveLength(0);
  });

  it('bordered draws the shared card surface', () => {
    const { container } = render(Panel, { props: { children: text('Body') } });
    const cls = classesOf(rootOf(container));
    expect(cls).toContain('border');
    expect(cls).toContain('border-line');
    expect(cls).toContain('bg-surface');
    expect(cls).toContain('rounded-xl');
  });

  it('plain has no border', () => {
    // Not border-0 on top of the surface: two utilities for one property
    // resolve by the order Tailwind emits them, so the box could come back.
    const { container } = render(Panel, {
      props: { variant: 'plain', heading: 'Retention', children: text('Body') },
    });
    const cls = classesOf(rootOf(container));
    expect(cls.some((c) => c.startsWith('border'))).toBe(false);
    expect(cls).not.toContain('bg-surface');
    expect(cls).not.toContain('rounded-xl');
    // The heading survives the box being removed. That is the point of plain.
    expect(container.querySelector('h3')?.textContent?.trim()).toBe('Retention');
  });

  it('pads from the shared card scale and states nothing for none', () => {
    // Nine hand-rolled paddings collapse onto these names, so a panel and a
    // card on the same page agree on the inset.
    const md = render(Panel, { props: { children: text('Body') } });
    const sm = render(Panel, { props: { pad: 'sm', children: text('Body') } });
    const none = render(Panel, { props: { pad: 'none', children: text('Body') } });
    expect(classesOf(rootOf(md.container))).toContain('p-card');
    expect(classesOf(rootOf(sm.container))).toContain('p-card-sm');
    expect(classesOf(rootOf(none.container)).some((c) => /^p-/.test(c))).toBe(false);
  });

  it('states one padding utility, whatever the variant', () => {
    for (const variant of ['bordered', 'plain'] as const) {
      const { container, unmount } = render(Panel, {
        props: { variant, children: text('Body') },
      });
      const pads = classesOf(rootOf(container)).filter((c) => /^p-/.test(c));
      expect(pads, variant).toHaveLength(1);
      unmount();
    }
  });

  it('renders the description and the actions', () => {
    const { getByText } = render(Panel, {
      props: {
        heading: 'Retention',
        description: 'How long a record is kept',
        actions: text('Edit'),
        children: text('Body'),
      },
    });
    expect(getByText('How long a record is kept')).toBeTruthy();
    expect(getByText('Edit')).toBeTruthy();
  });

  it('draws the icon before the heading text and hides it from a screen reader', () => {
    // The icon is decoration on a heading that already says the same thing, so
    // announcing it would repeat the heading.
    const { container } = render(Panel, {
      props: { heading: 'Retention', icon: Settings, children: text('Body') },
    });
    const h3 = container.querySelector('h3') as HTMLElement;
    const svg = h3.querySelector('svg') as SVGElement;
    expect(svg).toBeTruthy();
    expect(svg.closest('[aria-hidden="true"]')).toBeTruthy();
    expect(h3.textContent?.trim()).toBe('Retention');
  });

  it('renders no header row when there is nothing to put in it', () => {
    const { container } = render(Panel, { props: { children: text('Body') } });
    expect(rootOf(container).children).toHaveLength(1);
  });

  it('accepts a consumer class without competing with a built-in utility', () => {
    // The consumer class is appended last in the string, which decides nothing:
    // two utilities for one property resolve by the order Tailwind emits them.
    // A margin is safe here because the panel states none.
    const { container } = render(Panel, { props: { class: 'mt-4', children: text('Body') } });
    const cls = classesOf(rootOf(container));
    expect(cls).toContain('mt-4');
    expect(cls.filter((c) => c !== 'mt-4').some((c) => /^-?m[trblxy]?-/.test(c))).toBe(false);
  });
});
