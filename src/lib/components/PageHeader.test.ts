import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    expect(container.querySelector('h1')?.textContent).toBe('Dashboard');
  });

  it('renders the description', () => {
    const { getByText } = render(PageHeader, {
      props: { title: 'Dashboard', description: 'Your overview' },
    });
    expect(getByText('Your overview')).toBeTruthy();
  });

  it('renders an actions snippet', () => {
    const { getByText } = render(PageHeader, {
      props: { title: 'Dashboard', actions: text('New') },
    });
    expect(getByText('New')).toBeTruthy();
  });

  it('keeps its heading gap by default', () => {
    // Forty-three pages across the consuming applications render this component directly and
    // take their heading gap from it. Removing the margin outright moved every
    // one of them by 32px with nothing in their own source to explain it, so
    // the margin stays and the caller that owns the rhythm opts out.
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    expect((container.querySelector('header') as HTMLElement).className).toMatch(/\bmb-8\b/);
  });

  it('drops the margin when the caller owns the rhythm', () => {
    const { container } = render(PageHeader, { props: { title: 'Dashboard', flush: true } });
    expect((container.querySelector('header') as HTMLElement).className).not.toMatch(/\bmb-/);
  });

  it('leaves a consumer margin uncontested when it is flush', () => {
    // The defect this guards is two margin utilities in one attribute, where
    // the winner is whichever Tailwind emitted last rather than the one the
    // page asked for. A page setting its own gap says so.
    const { container } = render(PageHeader, {
      props: { title: 'Dashboard', flush: true, class: 'mb-2' },
    });
    const margins = (container.querySelector('header') as HTMLElement).className.match(/\bmb-\S+/g);
    expect(margins).toEqual(['mb-2']);
  });

  it('renders a compact title and drops the description', () => {
    // A full-height page spends every pixel it does not give away, so the
    // title row shrinks to one line and the description does not render.
    const { container, queryByText } = render(PageHeader, {
      props: { title: 'Canvas', description: 'Your overview', compact: true },
    });
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(h1.textContent).toBe('Canvas');
    expect(h1.className).toContain('text-sm');
    expect(h1.className).not.toContain('text-h2');
    expect(queryByText('Your overview')).toBeNull();
  });

  it('sizes the page title from the brand ramp', () => {
    // The title rendered at 24px, which is not a step the ramp holds at all,
    // while every one of the ramp's size tokens went unreferenced. text-h2 is
    // 32px, while text-h1 is 44px and belongs to a marketing page rather than to a
    // console whose table under this heading sets at 14px.
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    const cls = (container.querySelector('h1') as HTMLElement).className;
    expect(cls).toContain('sm:text-h2');
    expect(cls).toContain('sm:leading-title');
    expect(cls).toContain('tracking-h2');
    expect(cls).not.toContain('text-h1');
  });

  it('steps down to the console scale below sm, and only there', () => {
    // A phone gets the 24/32 step. Every other console size would be a size
    // the theme file does not declare for a title.
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    const cls = (container.querySelector('h1') as HTMLElement).className.split(/\s+/);
    expect(cls).toContain('text-2xl');
    expect(cls.filter((c) => /^text-(?:\dxl|h\d)$/.test(c))).toEqual(['text-2xl']);
  });

  it('sets the title semibold, the weight of the headings under it', () => {
    // A 700 title at 32px read heavier than the semibold card headings under
    // it. The weight moved to 600 with the tighter leading.
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    const cls = (container.querySelector('h1') as HTMLElement).className;
    expect(cls).toContain('font-semibold');
    expect(cls).not.toContain('font-bold');
  });
});

describe('PageHeader actions on a narrow screen', () => {
  it('lets the slot wrap: beside the title while it fits, under it at the end edge when not', () => {
    // `shrink-0` sizes a flex item to its content, so the slot could not wrap
    // even when the page put a wrapping row inside it: four actions pushed
    // the primary one 83px past a 400px screen.
    const actions = createRawSnippet(() => ({ render: () => '<button>New</button>' }));
    const { container } = render(PageHeader, { props: { title: 'Flows', actions } });
    const slot = container.querySelector('[data-testid="page-actions"]') as HTMLElement;
    const list = slot.className.split(/\s+/);
    expect(list).not.toContain('shrink-0');
    expect(list).toContain('flex-wrap');
    expect(list).toContain('min-w-0');
    // ms-auto is what puts a dropped slot at the end edge, and justify-end is
    // what keeps every line of a wrapped slot there, in the order given.
    expect(list).toContain('ms-auto');
    expect(list).toContain('justify-end');
  });
});
