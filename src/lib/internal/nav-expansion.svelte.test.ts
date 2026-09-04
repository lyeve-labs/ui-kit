import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNavExpansion, type NavExpansionOptions } from './nav-expansion.svelte.js';
import type { NavTree } from './nav-tree.js';

const tree: NavTree = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  {
    id: 'content',
    label: 'Content',
    href: '/content',
    children: [
      { id: 'entries', label: 'Entries', href: '/content/entries' },
      { id: 'media', label: 'Media', href: '/content/media' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    defaultExpanded: true,
    children: [
      { id: 'team', label: 'Team', href: '/settings/team' },
      {
        id: 'billing',
        label: 'Billing',
        children: [{ id: 'invoices', label: 'Invoices', href: '/settings/billing/invoices' }],
      },
    ],
  },
];

function make(overrides: Partial<NavExpansionOptions> = {}) {
  return createNavExpansion({
    items: () => tree,
    activePath: () => '/',
    expandActive: () => true,
    exclusive: () => false,
    storageKey: () => undefined,
    ...overrides,
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('createNavExpansion defaults', () => {
  it('opens a group that ships expanded', () => {
    expect(make().isExpanded('settings')).toBe(true);
  });

  it('keeps every other group shut', () => {
    expect(make().isExpanded('content')).toBe(false);
  });

  it('opens the ancestors of the current page', () => {
    const expansion = make({ activePath: () => '/settings/billing/invoices' });
    expect(expansion.isExpanded('settings')).toBe(true);
    expect(expansion.isExpanded('billing')).toBe(true);
  });

  it('leaves the ancestors shut when expandActive is off', () => {
    const expansion = make({ activePath: () => '/content/media', expandActive: () => false });
    expect(expansion.isExpanded('content')).toBe(false);
  });

  it('lets a reader shut the group the current page is in', () => {
    // The default follows the page only until the reader decides otherwise. A
    // flat set of open ids reopens the group on every navigation inside it.
    const expansion = make({ activePath: () => '/content/media' });
    expect(expansion.isExpanded('content')).toBe(true);
    expansion.collapse('content');
    expect(expansion.isExpanded('content')).toBe(false);
  });

  it('lets a reader shut a group that ships expanded', () => {
    const expansion = make();
    expansion.collapse('settings');
    expect(expansion.isExpanded('settings')).toBe(false);
  });

  it('toggle flips whichever state the group is in', () => {
    const expansion = make();
    expansion.toggle('content');
    expect(expansion.isExpanded('content')).toBe(true);
    expansion.toggle('content');
    expect(expansion.isExpanded('content')).toBe(false);
  });
});

describe('exclusive', () => {
  it('closes the previously open group', () => {
    const expansion = make({ exclusive: () => true });
    expansion.expand('content');
    expect(expansion.isExpanded('content')).toBe(true);
    // Settings ships expanded, so the exclusive open has to override a default
    // and not just another explicit decision.
    expect(expansion.isExpanded('settings')).toBe(false);

    expansion.expand('settings');
    expect(expansion.isExpanded('settings')).toBe(true);
    expect(expansion.isExpanded('content')).toBe(false);
  });

  it('keeps the ancestors of the group being opened', () => {
    // Collapsing Settings to open Billing would hide the group just asked for.
    const expansion = make({ exclusive: () => true });
    expansion.expand('billing');
    expect(expansion.isExpanded('billing')).toBe(true);
    expect(expansion.isExpanded('settings')).toBe(true);
    expect(expansion.isExpanded('content')).toBe(false);
  });

  it('leaves every group alone when exclusive is off', () => {
    const expansion = make();
    expansion.expand('content');
    expect(expansion.isExpanded('content')).toBe(true);
    expect(expansion.isExpanded('settings')).toBe(true);
  });
});

describe('persistence', () => {
  it('persists expansion under a storageKey', () => {
    const first = make({ storageKey: () => 'sidebar' });
    first.expand('content');
    expect(localStorage.getItem('sidebar')).toContain('content');

    const second = make({ storageKey: () => 'sidebar' });
    expect(second.isExpanded('content')).toBe(true);
  });

  it('persists a collapse as well as an expand', () => {
    make({ storageKey: () => 'sidebar' }).collapse('settings');
    expect(make({ storageKey: () => 'sidebar' }).isExpanded('settings')).toBe(false);
  });

  it('stays in memory without a storageKey', () => {
    const first = make();
    first.expand('content');
    expect(localStorage.length).toBe(0);

    const second = make();
    expect(second.isExpanded('content')).toBe(false);
  });

  it('ignores a stored value that is not an object', () => {
    localStorage.setItem('sidebar', '"open"');
    expect(make({ storageKey: () => 'sidebar' }).isExpanded('content')).toBe(false);
  });

  it('ignores a stored value that is not JSON', () => {
    localStorage.setItem('sidebar', 'not json');
    expect(make({ storageKey: () => 'sidebar' }).isExpanded('content')).toBe(false);
  });

  it('drops the non-boolean entries and keeps the rest', () => {
    localStorage.setItem('sidebar', JSON.stringify({ content: true, settings: 'yes' }));
    const expansion = make({ storageKey: () => 'sidebar' });
    expect(expansion.isExpanded('content')).toBe(true);
    // settings falls back to its own default rather than to a truthy string.
    expect(expansion.isExpanded('settings')).toBe(true);
  });

  it('keeps a stored id the tree no longer holds', () => {
    localStorage.setItem('sidebar', JSON.stringify({ retired: true }));
    const expansion = make({ storageKey: () => 'sidebar', exclusive: () => true });
    expansion.expand('content');
    expect(localStorage.getItem('sidebar')).toContain('retired');
  });
});

describe('localStorage that refuses to work', () => {
  it('a read that throws does not break expansion', () => {
    // A private window answers getItem with a SecurityError.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    const expansion = make({ storageKey: () => 'sidebar' });
    expect(expansion.isExpanded('settings')).toBe(true);
    expect(expansion.isExpanded('content')).toBe(false);
  });

  it('a write that throws does not break expansion', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const expansion = make({ storageKey: () => 'sidebar' });
    expect(() => expansion.expand('content')).not.toThrow();
    expect(expansion.isExpanded('content')).toBe(true);
  });

  it('an absent localStorage does not break expansion', () => {
    // The server has no localStorage at all.
    vi.stubGlobal('localStorage', undefined);
    const expansion = make({ storageKey: () => 'sidebar' });
    expect(() => expansion.expand('content')).not.toThrow();
    expect(expansion.isExpanded('content')).toBe(true);
  });
});
