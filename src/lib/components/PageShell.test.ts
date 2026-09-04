import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageShell from './PageShell.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const widths = ['narrow', 'default', 'wide', 'full'] as const;

const frameOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;

const capOf = (el: HTMLElement) => el.className.split(/\s+/).find((c) => c.startsWith('max-w-'));

describe('PageShell', () => {
  it('renders its children', () => {
    const { getByText } = render(PageShell, {
      props: { title: 'Team', children: text('Body') },
    });
    expect(getByText('Body')).toBeTruthy();
  });

  it('renders exactly one h1', () => {
    // The title is the page's only h1. A shell that rendered a second one, or
    // a page that added its own beside it, makes a heading query ambiguous for
    // every reader navigating by headings.
    const { container, getAllByRole } = render(PageShell, {
      props: { title: 'Team', description: 'Who can sign in', children: text('Body') },
    });
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(container.querySelector('h1')?.textContent).toBe('Team');
  });

  it('renders no main, aside or section landmark, and no header of its own', () => {
    // An app shell already owns the landmarks. A second main or aside changes
    // what a landmark query matches, so the page frame contributes none.
    const { container } = render(PageShell, {
      props: { title: 'Team', children: text('Body') },
    });
    expect(container.querySelectorAll('main, aside, section')).toHaveLength(0);
    const headers = container.querySelectorAll('header');
    expect(headers).toHaveLength(1);
    expect(headers[0].querySelector('h1'), 'the one header is PageHeader own').toBeTruthy();
  });

  it('caps each width differently and always centres a full-width column', () => {
    // Five raw caps were chosen per page with no rule, and one page rendered
    // against the left edge of the window because it set a cap and forgot
    // mx-auto. Both come with the gutter here.
    const caps = new Set<string>();
    for (const width of widths) {
      const { container, unmount } = render(PageShell, {
        props: { title: 'Team', width, children: text('Body') },
      });
      const frame = frameOf(container);
      expect(frame.className, width).toContain('mx-auto');
      expect(frame.className, width).toContain('w-full');
      const cap = capOf(frame);
      expect(cap, `${width} states no cap`).toBeDefined();
      caps.add(cap!);
      unmount();
    }
    expect(caps.size, 'two widths resolve to the same cap').toBe(widths.length);
  });

  it('defaults to the default width', () => {
    const bare = render(PageShell, { props: { title: 'Team', children: text('Body') } });
    const named = render(PageShell, {
      props: { title: 'Team', width: 'default', children: text('Body') },
    });
    expect(capOf(frameOf(bare.container))).toBe(capOf(frameOf(named.container)));
  });

  it('states the gutter once, from the shared page padding', () => {
    const { container } = render(PageShell, {
      props: { title: 'Team', children: text('Body') },
    });
    const frame = frameOf(container);
    expect(frame.className).toContain('px-page-x');
    expect(frame.className).toContain('py-page-y');
  });

  it('fill drops the gutter and the cap and renders the compact title', () => {
    // The shape a split pane needs. Two pages carry a documented waiver against
    // their app's own layout lint because the shell had no way to express it.
    const { container, queryByText } = render(PageShell, {
      props: {
        title: 'Canvas',
        description: 'Suppressed while compact',
        fill: true,
        children: text('Body'),
      },
    });
    const frame = frameOf(container);
    expect(frame.className).not.toContain('px-page-x');
    expect(frame.className).not.toContain('py-page-y');
    expect(capOf(frame), 'a fill page states no cap').toBeUndefined();
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(h1.className).toContain('text-sm');
    expect(h1.className).not.toContain('text-2xl');
    expect(queryByText('Suppressed while compact')).toBeNull();
  });

  it('puts the breadcrumb above the title', () => {
    const { container, getByText } = render(PageShell, {
      props: { title: 'Team', breadcrumb: text('Settings'), children: text('Body') },
    });
    const crumb = getByText('Settings');
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(crumb.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('wraps the children in the section stack', () => {
    // Adding a section is appending a child. The gap is the shell's, so a page
    // cannot set its own and no page has to remember to set one at all.
    const { container, getByText } = render(PageShell, {
      props: { title: 'Team', children: text('Body') },
    });
    const stack = getByText('Body').parentElement as HTMLElement;
    expect(stack.className).toContain('flex-col');
    expect(stack.className).toContain('gap-section');
    expect(stack.parentElement).toBe(frameOf(container));
  });

  it('renders the title row with no margin competing against the stack gap', () => {
    const { container } = render(PageShell, {
      props: { title: 'Team', children: text('Body') },
    });
    const header = container.querySelector('header') as HTMLElement;
    expect(header.className).not.toContain('mb-8');
    expect(header.className).not.toMatch(/\bmb-/);
  });

  it('renders a description and an actions snippet', () => {
    const { getByText } = render(PageShell, {
      props: {
        title: 'Team',
        description: 'Who can sign in',
        actions: text('Invite'),
        children: text('Body'),
      },
    });
    expect(getByText('Who can sign in')).toBeTruthy();
    expect(getByText('Invite')).toBeTruthy();
  });

  it('accepts a consumer class on the frame', () => {
    const { container } = render(PageShell, {
      props: { title: 'Team', class: 'pb-0', children: text('Body') },
    });
    expect(frameOf(container).className).toContain('pb-0');
  });
});
