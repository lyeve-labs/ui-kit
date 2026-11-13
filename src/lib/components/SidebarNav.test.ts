import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FileText, Globe, Settings } from '@lucide/svelte';
import SidebarNav from './SidebarNav.svelte';
import type { NavTree } from '../internal/nav-tree.js';

const src = readFileSync(join(__dirname, 'SidebarNav.svelte'), 'utf8');

const items: NavTree = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  {
    id: 'content',
    label: 'Content',
    href: '/content',
    badge: 12,
    badgeTone: 'warn',
    children: [
      { id: 'entries', label: 'Entries', href: '/content/entries' },
      { id: 'media', label: 'Media', href: '/content/media' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    children: [
      { id: 'general', label: 'General', href: '/settings' },
      {
        id: 'billing',
        label: 'Billing',
        children: [{ id: 'invoices', label: 'Invoices', href: '/settings/billing/invoices' }],
      },
    ],
  },
  { id: 'archive', label: 'Archive', href: '/archive', disabled: true },
];

function mount(props: Partial<{ activePath: string }> & Record<string, unknown> = {}) {
  return render(SidebarNav, { props: { items, activePath: '/', ...props } });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('SidebarNav landmark', () => {
  it('renders a nav named Primary by default', () => {
    const { getByRole } = mount();
    expect(getByRole('navigation', { name: 'Primary' })).toBeTruthy();
  });

  it('takes the accessible name the caller gives it', () => {
    const { getByRole } = mount({ label: 'Workspace' });
    expect(getByRole('navigation', { name: 'Workspace' })).toBeTruthy();
  });

  it('renders no aside or other landmark', () => {
    // The app shell already owns the aside. A second landmark changes what a
    // landmark query matches and has a screen reader announce the sidebar
    // twice, once as a region and once as navigation.
    const { container } = mount();
    for (const tag of ['aside', 'header', 'main', 'section', 'form']) {
      expect(container.querySelector(tag), `rendered a ${tag}`).toBeNull();
    }
    expect(container.querySelectorAll('nav')).toHaveLength(1);
  });

  it('builds the list from ul and li only', () => {
    const { container } = mount();
    const nav = container.querySelector('nav')!;
    for (const child of nav.querySelectorAll('ul > *')) {
      expect(child.tagName).toBe('LI');
    }
  });

  it('leaves a child list as a list', () => {
    // role="group" on the nested ul took the list role off it, and a listitem
    // whose parent is not a list is an ARIA context error that axe reports as
    // serious on every row of an open section.
    const { container } = mount();
    const nested = [...container.querySelectorAll('ul ul')];
    expect(nested.length).toBeGreaterThan(0);
    for (const list of nested) expect(list.getAttribute('role')).toBeNull();
  });
});

describe('SidebarNav current page', () => {
  it('puts aria-current page on the leaf and true on its ancestors', () => {
    const { getByRole, container } = mount({ activePath: '/settings/billing/invoices' });

    expect(getByRole('link', { name: 'Invoices' }).getAttribute('aria-current')).toBe('page');

    const ancestors = [...container.querySelectorAll('button[aria-current]')].map((el) =>
      el.getAttribute('aria-current'),
    );
    expect(ancestors).toEqual(['true', 'true']);
  });

  it('never lets a parent link claim its child page', () => {
    // The rule this component replaces marked the parent and the child at once,
    // so two rows said "you are here" and neither of them was right.
    const { getByRole } = mount({ activePath: '/content/media' });
    expect(getByRole('link', { name: 'Media' }).getAttribute('aria-current')).toBe('page');
    expect(getByRole('link', { name: /Content/ }).getAttribute('aria-current')).toBeNull();
  });

  it('shows the section that holds the current page as open, in full text color, with no mark', () => {
    // The section drew a curved rail of its own beside the page's bar, so two
    // rows of two shapes each said where the reader was.
    const { getByRole } = mount({ activePath: '/content/media' });
    const disclosure = getByRole('button', { name: /Content/ });
    expect(disclosure.getAttribute('aria-current')).toBe('true');
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    const section = getByRole('link', { name: /Content/ }).className.split(/\s+/);
    expect(section).toContain('text-fg');
    expect(section).toContain('border-transparent');
    expect(section.filter((c) => /^(?:bg-|after:)/.test(c))).toEqual([]);
  });

  /** Every row that carries a current mark: the tint or the accent bar. */
  function marked(container: HTMLElement): Element[] {
    return [...container.querySelectorAll('[class]')].filter((el) =>
      (el.getAttribute('class') ?? '')
        .split(/\s+/)
        .some((c) => c === 'bg-tint' || c.startsWith('after:bg-accent')),
    );
  }

  it.each(['/', '/content/media', '/settings/billing/invoices'])(
    'carries exactly one current mark in the whole tree at %s',
    (activePath) => {
      const { container } = mount({ activePath });
      const rows = marked(container);
      expect(rows).toHaveLength(1);
      expect(rows[0].getAttribute('aria-current')).toBe('page');
      expect(container.innerHTML).not.toMatch(/\bborder-brand\b/);
    },
  );

  it('moves the one mark to the section a reader closes, and back when it opens', async () => {
    const { container, getByRole } = mount({ activePath: '/content/media' });
    const media = getByRole('link', { name: 'Media' });
    const section = getByRole('link', { name: /Content/ });
    const pageClasses = media.className;
    expect(marked(container)).toEqual([media]);

    await fireEvent.click(getByRole('button', { name: /Collapse Content/ }));
    expect(marked(container)).toEqual([section]);
    // Every class the page's row carries. The section's link adds only the two
    // that let it share its line with the disclosure.
    expect(section.className.split(/\s+/)).toEqual(
      expect.arrayContaining(pageClasses.split(/\s+/)),
    );
    expect(section.getAttribute('aria-current')).toBeNull();
    expect(media.getAttribute('aria-current')).toBe('page');

    await fireEvent.click(getByRole('button', { name: /Expand Content/ }));
    expect(marked(container)).toEqual([media]);
    expect(section.className.split(/\s+/)).not.toContain('bg-tint');
  });

  it('marks only the outermost section a reader closes', async () => {
    const { container, getByRole } = mount({ activePath: '/settings/billing/invoices' });
    await fireEvent.click(getByRole('button', { name: /Billing/ }));
    expect(marked(container)).toEqual([getByRole('button', { name: /Billing/ })]);
    await fireEvent.click(getByRole('button', { name: /Settings/ }));
    expect(marked(container)).toEqual([getByRole('button', { name: /Settings/ })]);
  });

  it('draws a nested current row with exactly the classes of a top-level one', () => {
    const current = (activePath: string) =>
      mount({ activePath }).container.querySelector('[aria-current="page"]')!;
    const top = current('/');
    const nested = current('/settings/billing/invoices');
    expect(top.textContent?.trim()).toBe('Dashboard');
    expect(nested.textContent?.trim()).toBe('Invoices');
    expect(nested.className).toBe(top.className);
    expect(nested.getAttribute('style')).toBe(top.getAttribute('style'));
  });

  it('puts no border or edge on the current row that a row at rest lacks', () => {
    const { getByRole } = mount({ activePath: '/content/media' });
    const edges = (name: string) =>
      getByRole('link', { name })
        .className.split(/\s+/)
        .filter((c) => /^(?:border|inset-shadow|ring|shadow)/.test(c));
    expect(edges('Media')).toEqual(edges('Entries'));
  });

  it('marks a leaf that sits on the same path as its group', () => {
    const { getByRole } = mount({ activePath: '/settings' });
    expect(getByRole('link', { name: 'General' }).getAttribute('aria-current')).toBe('page');
  });

  it('marks nothing when the path is in no branch', () => {
    const { container } = mount({ activePath: '/nowhere' });
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0);
  });
});

describe('SidebarNav disclosure', () => {
  it('renders two controls for a node with href and children', () => {
    // One control cannot know whether a click meant "go there" or "open it",
    // and guessing gets it wrong half the time.
    const { getByRole } = mount();
    expect(getByRole('link', { name: /Content/ }).getAttribute('href')).toBe('/content');
    expect(getByRole('button', { name: /Content/ }).getAttribute('aria-expanded')).toBeTruthy();
  });

  it('points aria-controls at a child list that exists', () => {
    const { getByRole, container } = mount();
    const id = getByRole('button', { name: /Content/ }).getAttribute('aria-controls');
    expect(id).toBeTruthy();
    const list = container.querySelector(`[id="${id}"]`);
    expect(list).toBeTruthy();
    expect(list!.tagName).toBe('UL');
  });

  it('builds that id from $props.id() and never from Math.random', () => {
    // A random id differs between the server render and hydration, so every
    // aria-controls built from it points at an element that no longer exists.
    expect(src).toContain('$props.id()');
    expect(src).not.toContain('Math.random');
  });

  it('opens and shuts a group on click', async () => {
    const { getByRole } = mount();
    const button = getByRole('button', { name: /Content/ });
    expect(button.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    await fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the ancestors of the current page', () => {
    const { getByRole } = mount({ activePath: '/settings/billing/invoices' });
    expect(getByRole('button', { name: /Settings/ }).getAttribute('aria-expanded')).toBe('true');
    expect(getByRole('button', { name: /Billing/ }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a shut group in the document, inert, in a row collapsed to nothing', () => {
    // aria-controls needs the element to exist while the group is shut, and a
    // row that animates to zero height keeps it, where a display utility
    // cannot animate at all.
    const { getByRole, container } = mount();
    const id = getByRole('button', { name: /Content/ }).getAttribute('aria-controls')!;
    const list = container.querySelector(`[id="${id}"]`)!;
    // Svelte sets inert as a DOM property, not a reflected attribute.
    expect((list as HTMLElement).inert).toBe(true);
    expect(list.parentElement!.parentElement!.getAttribute('class')).toContain('grid-rows-[0fr]');
  });

  // A slide on a group that follows the page moved every row below it, the
  // one under the pointer included, on each page change into or out of it.
  it('slides a group the reader opens, and switches one that follows the page in one frame', async () => {
    const { getByRole, container, rerender } = mount();
    const rowOf = (name: RegExp) => {
      const id = getByRole('button', { name }).getAttribute('aria-controls')!;
      return container.querySelector(`[id="${id}"]`)!.parentElement!.parentElement!;
    };

    await rerender({ items, activePath: '/settings' });
    expect(rowOf(/Settings/).getAttribute('class')).toContain('grid-rows-[1fr]');
    expect(rowOf(/Settings/).getAttribute('class')).not.toContain('transition');

    await rerender({ items, activePath: '/' });
    expect(rowOf(/Settings/).getAttribute('class')).toContain('grid-rows-[0fr]');
    expect(rowOf(/Settings/).getAttribute('class')).not.toContain('transition');

    await fireEvent.click(getByRole('button', { name: /Content/ }));
    expect(rowOf(/Content/).getAttribute('class')).toContain('grid-rows-[1fr]');
    expect(rowOf(/Content/).getAttribute('class')).toContain(
      'transition-[grid-template-rows] duration-base',
    );
  });

  it('gives every button an inset focus ring', () => {
    // A sidebar scrolls, and a scrolling box crops the ring that sits outside
    // the element it belongs to.
    const { container } = mount();
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const cls = button.getAttribute('class') ?? '';
      expect(cls).toContain('outline-none');
      expect(cls).toContain('focus-visible:ring-2');
      expect(cls).toContain('focus-visible:ring-inset');
      expect(cls).toContain('focus-visible:ring-focus');
    }
  });
});

describe('SidebarNav expansion state', () => {
  it('exclusive closes the previously open group', async () => {
    const { getByRole } = mount({ exclusive: true });
    const content = getByRole('button', { name: /Content/ });
    const settings = getByRole('button', { name: /Settings/ });

    await fireEvent.click(content);
    expect(content.getAttribute('aria-expanded')).toBe('true');

    await fireEvent.click(settings);
    expect(settings.getAttribute('aria-expanded')).toBe('true');
    expect(content.getAttribute('aria-expanded')).toBe('false');
  });

  it('persists expansion under a storageKey', async () => {
    const first = mount({ storageKey: 'sidebar' });
    await fireEvent.click(first.getByRole('button', { name: /Content/ }));
    first.unmount();

    const second = mount({ storageKey: 'sidebar' });
    expect(second.getByRole('button', { name: /Content/ }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('stays in memory without a storageKey', async () => {
    const first = mount();
    await fireEvent.click(first.getByRole('button', { name: /Content/ }));
    expect(localStorage.length).toBe(0);
    first.unmount();

    const second = mount();
    expect(second.getByRole('button', { name: /Content/ }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('renders when localStorage throws on read', () => {
    // A private window answers getItem with a SecurityError.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    const { getByRole } = mount({ storageKey: 'sidebar' });
    expect(getByRole('navigation', { name: 'Primary' })).toBeTruthy();
  });

  it('renders when localStorage throws on write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const { getByRole } = mount({ storageKey: 'sidebar' });
    const button = getByRole('button', { name: /Content/ });
    await fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders when localStorage is absent', () => {
    vi.stubGlobal('localStorage', undefined);
    const { getByRole } = mount({ storageKey: 'sidebar' });
    expect(getByRole('navigation', { name: 'Primary' })).toBeTruthy();
  });
});

describe('SidebarNav indentation', () => {
  it('indents each nested list by one token step, and no row by its own padding', () => {
    // A row padded by its depth kept its box, its fill and its bar in its
    // parent's column while its label moved in.
    const { getByRole } = mount({ activePath: '/settings/billing/invoices' });
    const invoices = getByRole('link', { name: 'Invoices' });
    expect(invoices.getAttribute('style')).toBeNull();
    const lists = [];
    for (
      let el = invoices.closest('ul');
      el && el.tagName === 'UL';
      el = el.parentElement?.closest('ul') ?? null
    ) {
      lists.push(el.className.split(/\s+/).includes('ms-nav-indent'));
    }
    expect(lists).toEqual([true, true, false]);
  });

  it('renders no class containing a brace', () => {
    // A class built from a runtime depth, ps-[{depth}rem], matches no candidate
    // in Tailwind's scan of the source, so no rule is generated and every level
    // renders flush against the edge.
    const { container } = mount({ activePath: '/settings/billing/invoices' });
    for (const el of container.querySelectorAll('[class]')) {
      expect(el.getAttribute('class'), el.tagName).not.toMatch(/[{}]/);
    }
  });

  it('keys every each by a stable id', () => {
    const eaches = src.match(/\{#each[^}]*\}/g) ?? [];
    expect(eaches.length).toBeGreaterThan(0);
    for (const each of eaches) {
      expect(each, 'unkeyed each').toMatch(/\([\w.]+\)\}$/);
    }
  });

  it('states no duration beside a color transition, which the theme already sets', () => {
    expect(src).not.toMatch(/transition-colors\s+duration-/);
  });
});

describe('SidebarNav collapsed rail', () => {
  it('narrows to the rail token', () => {
    const { getByRole } = mount({ collapsed: true });
    expect(getByRole('navigation').getAttribute('class')).toContain('w-nav-rail');
  });

  it('keeps the label as the accessible name', () => {
    // An icon-only row with no label is announced as an empty link.
    const { getByRole } = mount({ collapsed: true });
    expect(getByRole('link', { name: 'Dashboard' })).toBeTruthy();
  });

  describe('an entry on the rail', () => {
    /** Each entry a link with a Lucide icon, the way every console passes one. */
    const iconItems: NavTree = [
      { id: 'sites', label: 'Sites', href: '/sites', icon: Globe },
      { id: 'pages', label: 'Pages', href: '/pages', icon: FileText },
      { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
    ];
    const rail = () =>
      render(SidebarNav, { props: { items: iconItems, activePath: '/pages', collapsed: true } });

    it('draws its icon at the 20px rung, because nothing sits beside it', () => {
      const { container } = rail();
      const sizes = [...container.querySelectorAll('nav a svg')].map((svg) =>
        svg.getAttribute('width'),
      );
      expect(sizes).toEqual(['20', '20', '20']);
    });

    it('keeps the 16px rung beside a label in the full column', () => {
      const { container } = render(SidebarNav, {
        props: { items: iconItems, activePath: '/pages' },
      });
      const sizes = [...container.querySelectorAll('nav a svg')].map((svg) =>
        svg.getAttribute('width'),
      );
      expect(sizes).toEqual(['16', '16', '16']);
    });

    it('is one centered square, the current one included', () => {
      // A full-width row with its label hidden put the icon left of center and
      // ran the current fill under the rail's edge.
      const { container } = rail();
      const rows = [...container.querySelectorAll('nav a')];
      for (const row of rows) {
        const classes = row.className.split(/\s+/);
        expect(classes).toEqual(expect.arrayContaining(['size-10', 'mx-auto', 'justify-center']));
        expect(classes).not.toContain('w-full');
      }
    });

    it('marks the current entry by its fill alone, with no bar at the edge', () => {
      const { getByRole } = rail();
      const current = getByRole('link', { name: 'Pages' });
      expect(current.getAttribute('aria-current')).toBe('page');
      expect(current.className.split(/\s+/).filter((c) => c.startsWith('after:'))).toEqual([]);
      expect(current.className).toContain('bg-tint');
    });

    it('names every entry', () => {
      const { getByRole } = rail();
      for (const label of ['Sites', 'Pages', 'Settings'])
        expect(getByRole('link', { name: label })).toBeTruthy();
    });
  });

  it('drops the indent, which a rail has no room for', () => {
    const { container } = mount({ collapsed: true, activePath: '/settings/billing/invoices' });
    expect(container.querySelectorAll('.ms-nav-indent')).toHaveLength(0);
  });

  it('marks a nested current page on the rail as it marks a top-level one', () => {
    const current = (activePath: string) => {
      const rows = mount({ collapsed: true, activePath }).container.querySelectorAll(
        '[aria-current="page"]',
      );
      expect(rows).toHaveLength(1);
      return rows[0];
    };
    const top = current('/');
    const nested = current('/settings/billing/invoices');
    expect(nested.textContent?.trim()).toBe('Invoices');
    expect(nested.className).toBe(top.className);
  });

  describe('a group that is a page as well', () => {
    /** Answers the pointer query the way a mouse or a finger answers it. */
    function pointer(coarse: boolean): void {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(pointer: coarse)' ? coarse : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }));
    }

    /** The row that holds the group's link and its disclosure. */
    function pair(container: HTMLElement): HTMLElement {
      return container.querySelector('a[href="/content"]')!.parentElement as HTMLElement;
    }

    it.each([
      ['a mouse', false],
      ['a finger', true],
    ])('stacks the disclosure under the link under %s', (_reader, coarse) => {
      // Side by side the two did not fit the rail under either pointer. A mouse
      // saw the link squeezed to its padding with its icon under the chevron,
      // and a finger's pair was 92px wide and scrolled the nav sideways.
      pointer(coarse);
      const { container } = mount({ collapsed: true });
      const row = pair(container);
      const classes = row.className.split(/\s+/);
      expect(classes).toEqual(expect.arrayContaining(['flex', 'flex-col', 'items-center']));
      // Stated for every pointer, not under a variant only one of them matches.
      expect(classes.filter((c) => c.includes(':'))).toEqual([]);
      // The link comes first and is the rail's square, like every other entry.
      expect(row.firstElementChild?.tagName).toBe('A');
      expect(row.firstElementChild?.className.split(/\s+/)).toContain('size-10');
      expect(row.lastElementChild?.getAttribute('aria-controls')).toBeTruthy();
    });

    it('keeps the two side by side in the full column, exactly as before', () => {
      const { container } = mount();
      expect(pair(container).getAttribute('class')).toBe('flex items-center gap-1');
    });
  });
});

describe('SidebarNav disabled node', () => {
  it('renders a non-interactive row, not a link', () => {
    // An anchor without an href is not focusable and one with an href still
    // navigates, so a disabled entry that keeps its anchor is either invisible
    // to the keyboard or not disabled at all.
    const { queryByRole, getByText } = mount();
    expect(queryByRole('link', { name: 'Archive' })).toBeNull();

    const row = getByText('Archive').closest('[aria-disabled]');
    expect(row).toBeTruthy();
    expect(row!.tagName).toBe('SPAN');
    expect(row!.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('SidebarNav badge', () => {
  it('renders the badge in the tone the node names', () => {
    const { getByText } = mount();
    expect(getByText('12').getAttribute('class')).toContain('text-warn');
  });

  it('drops the badge on a collapsed rail', () => {
    const { queryByText } = mount({ collapsed: true });
    expect(queryByText('12')).toBeNull();
  });
});

describe('SidebarNav pointer feedback', () => {
  /*
   * The current row is the tail of the active trail, so on any nav with
   * sections in it the row for the page you are on is a nested one. It was the
   * single state with no hover step: every sibling around it lit up under the
   * pointer and it did not, which reads as the one disabled entry in the list.
   */
  it('answers the pointer on the row for the current page', () => {
    const { container } = mount({ activePath: '/content/entries' });
    const current = container.querySelector('[aria-current="page"]');
    expect(current).toBeTruthy();
    expect(current?.className).toMatch(/\bhover:/);
  });

  it('answers the pointer on every row, whatever state it is in', () => {
    const { container } = mount({ activePath: '/content/entries' });
    const rows = [...container.querySelectorAll('a, button')].filter((el) =>
      el.className.includes('border-s-2'),
    );
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) expect(row.className).toMatch(/\bhover:/);
  });

  /*
   * `hover:` compiles inside `@media (hover: hover)` and never matches a
   * finger, and below md: this nav is the drawer a phone opens.
   */
  it('acknowledges a finger on a row', () => {
    const { container } = mount({ activePath: '/' });
    const rows = [...container.querySelectorAll('a, button')].filter((el) =>
      el.className.includes('border-s-2'),
    );
    for (const row of rows) expect(row.className).toMatch(/\bactive:/);
  });

  it('turns the closed disclosure chevron round in a right-to-left page', () => {
    const { container } = mount({ activePath: '/' });
    const closed = [...container.querySelectorAll('svg')].filter(
      (s) => !s.className.baseVal.includes('rotate-90'),
    );
    expect(closed.length).toBeGreaterThan(0);
    for (const svg of closed) expect(svg.className.baseVal).toContain('rtl:rotate-180');
  });
});

describe('SidebarNav href', () => {
  it('refuses an href a browser would run as script', () => {
    const hostile: NavTree = [
      { id: 'leaf', label: 'Leaf', href: 'javascript:alert(1)' },
      {
        id: 'group',
        label: 'Group',
        href: 'data:text/html,<script>alert(1)</script>',
        children: [{ id: 'child', label: 'Child', href: '/child' }],
      },
    ];
    const { container } = render(SidebarNav, {
      props: { items: hostile, activePath: '/child' },
    });
    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('href') ?? '').not.toMatch(/^(javascript|data):/i);
    }
  });

  it('keeps a relative and an https href as given', () => {
    const plain: NavTree = [
      { id: 'local', label: 'Local', href: '/content/entries?page=2' },
      { id: 'away', label: 'Away', href: 'https://lyeve.com/docs' },
    ];
    const { getByText } = render(SidebarNav, { props: { items: plain, activePath: '/' } });
    expect(getByText('Local').closest('a')?.getAttribute('href')).toBe('/content/entries?page=2');
    expect(getByText('Away').closest('a')?.getAttribute('href')).toBe('https://lyeve.com/docs');
  });
});
