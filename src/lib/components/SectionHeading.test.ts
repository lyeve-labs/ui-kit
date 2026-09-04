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
    expect(h2.className).toContain('text-lg');
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
