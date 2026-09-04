import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it('marks a child list as a group', () => {
    const { container } = mount();
    expect(container.querySelectorAll('ul[role="group"]').length).toBeGreaterThan(0);
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

  it('marks the ancestor branch with a visible left rail', () => {
    // An expanded group whose active child has scrolled out of view still has
    // to say where the reader is.
    const { getByRole } = mount({ activePath: '/content/media' });
    const disclosure = getByRole('button', { name: /Content/ });
    expect(disclosure.getAttribute('aria-current')).toBe('true');
    expect(getByRole('link', { name: /Content/ }).getAttribute('class')).toContain('border-brand');
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
    expect(list!.getAttribute('role')).toBe('group');
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

  it('hides a shut group with a display utility rather than dropping it', () => {
    const { getByRole, container } = mount();
    const id = getByRole('button', { name: /Content/ }).getAttribute('aria-controls')!;
    const list = container.querySelector(`[id="${id}"]`)!;
    expect(list.getAttribute('class')).toContain('hidden');
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
      expect(cls).toContain('focus-visible:ring-brand');
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
  it('states the indent as a style attribute reading a token', () => {
    const { getByRole } = mount({ activePath: '/settings/billing/invoices' });
    expect(getByRole('link', { name: 'Dashboard' }).getAttribute('style')).toContain(
      'calc(var(--spacing-nav-indent) * 0 + var(--spacing-inline))',
    );
    expect(getByRole('link', { name: 'Invoices' }).getAttribute('style')).toContain(
      'calc(var(--spacing-nav-indent) * 2 + var(--spacing-inline))',
    );
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

  it('follows every colour transition with a stated duration', () => {
    expect(src).not.toMatch(/transition-colors(?!\s+duration-150)/);
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

  it('drops the indent, which a rail has no room for', () => {
    const { getByRole } = mount({ collapsed: true, activePath: '/settings/billing/invoices' });
    expect(getByRole('link', { name: 'Invoices' }).getAttribute('style')).toContain(
      'calc(var(--spacing-nav-indent) * 0 + var(--spacing-inline))',
    );
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
