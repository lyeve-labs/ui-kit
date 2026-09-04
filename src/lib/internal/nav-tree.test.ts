import { describe, expect, it } from 'vitest';
import { activeTrail, flattenNav, isActive, type NavNode, type NavTree } from './nav-tree.js';

/**
 * The tree these tests read is the shape the defect lives in: a section that
 * owns a path, a leaf sitting on that same path, and a sibling leaf one
 * segment below it.
 */
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
    children: [
      { id: 'settings-general', label: 'General', href: '/settings' },
      { id: 'settings-team', label: 'Team', href: '/settings/team' },
      {
        id: 'settings-billing',
        label: 'Billing',
        href: '/settings/billing',
        children: [{ id: 'invoices', label: 'Invoices', href: '/settings/billing/invoices' }],
      },
    ],
  },
];

function node(id: string): NavNode {
  const found = flattenNav(tree).find((entry) => entry.node.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found.node;
}

describe('isActive', () => {
  it('does not light a parent when a sibling leaf is the current page', () => {
    // The rule this replaces was `path === href || path.startsWith(href + '/')`
    // for every node, so standing on /settings/team lit General as well, and
    // the reader saw two rows claiming to be where they were. A leaf answers
    // for its own path and nothing below it.
    expect(isActive(node('settings-team'), '/settings/team')).toBe(true);
    expect(isActive(node('settings-general'), '/settings/team')).toBe(false);
  });

  it('does not light a leaf whose href is a prefix of a deeper sibling', () => {
    expect(isActive(node('settings-general'), '/settings/billing')).toBe(false);
    expect(isActive(node('settings-billing'), '/settings/billing')).toBe(true);
  });

  it('lights a leaf on its own exact path', () => {
    expect(isActive(node('settings-general'), '/settings')).toBe(true);
  });

  it('lights a node with children anywhere in its subtree', () => {
    expect(isActive(node('content'), '/content/entries')).toBe(true);
    expect(isActive(node('content'), '/content')).toBe(true);
  });

  it('stops a node with children at its own segment boundary', () => {
    // /content-archive is not inside /content, however much it looks like it.
    expect(isActive(node('content'), '/content-archive')).toBe(false);
  });

  it('never lets a root href claim every page', () => {
    // A dashboard at / with children would otherwise prefix-match the whole app.
    expect(isActive(node('dashboard'), '/')).toBe(true);
    expect(isActive(node('dashboard'), '/content')).toBe(false);
    const root: NavNode = {
      id: 'root',
      label: 'Root',
      href: '/',
      children: [{ id: 'child', label: 'Child', href: '/child' }],
    };
    expect(isActive(root, '/child')).toBe(false);
  });

  it('treats a trailing slash as the same page', () => {
    expect(isActive(node('settings-team'), '/settings/team/')).toBe(true);
    expect(isActive({ id: 'x', label: 'X', href: '/settings/team/' }, '/settings/team')).toBe(true);
  });

  it('honours an explicit match of prefix on a leaf', () => {
    const leaf: NavNode = { id: 'x', label: 'X', href: '/settings', match: 'prefix' };
    expect(isActive(leaf, '/settings/team')).toBe(true);
  });

  it('honours an explicit match of exact on a node with children', () => {
    const branch: NavNode = {
      id: 'x',
      label: 'X',
      href: '/settings',
      match: 'exact',
      children: [{ id: 'y', label: 'Y', href: '/settings/team' }],
    };
    expect(isActive(branch, '/settings/team')).toBe(false);
    expect(isActive(branch, '/settings')).toBe(true);
  });

  it('never lights a node whose match is none', () => {
    const opted: NavNode = { id: 'x', label: 'X', href: '/settings', match: 'none' };
    expect(isActive(opted, '/settings')).toBe(false);
  });

  it('never lights a node with no href', () => {
    expect(isActive(node('settings'), '/settings')).toBe(false);
  });

  it('matches nothing on an empty activePath', () => {
    expect(isActive(node('dashboard'), '')).toBe(false);
  });

  it('reports the path truthfully for a disabled node', () => {
    const off: NavNode = { id: 'x', label: 'X', href: '/settings', disabled: true };
    expect(isActive(off, '/settings')).toBe(true);
  });
});

describe('activeTrail', () => {
  it('returns the ancestor ids down to the matched leaf', () => {
    expect(activeTrail(tree, '/settings/team')).toEqual(['settings', 'settings-team']);
  });

  it('returns every ancestor id of a nested leaf', () => {
    expect(activeTrail(tree, '/settings/billing/invoices')).toEqual([
      'settings',
      'settings-billing',
      'invoices',
    ]);
  });

  it('stops at the node itself when it is a leaf', () => {
    expect(activeTrail(tree, '/')).toEqual(['dashboard']);
  });

  it('prefers the child over the parent that also matches by prefix', () => {
    // Content matches /content/media by prefix and Media matches it exactly.
    // Returning only Content would leave the group open with nothing marked.
    expect(activeTrail(tree, '/content/media')).toEqual(['content', 'media']);
  });

  it('returns the group alone when the path is under it but on no child', () => {
    expect(activeTrail(tree, '/content/tags')).toEqual(['content']);
  });

  it('returns an empty trail for a path the tree does not hold', () => {
    expect(activeTrail(tree, '/nowhere')).toEqual([]);
  });

  it('includes a group that matches nothing itself but holds the active child', () => {
    // Settings has no href at all, so only its child can match.
    expect(activeTrail(tree, '/settings')).toEqual(['settings', 'settings-general']);
  });
});

describe('flattenNav', () => {
  it('walks depth first and reports the depth of every node', () => {
    expect(flattenNav(tree).map((entry) => [entry.node.id, entry.depth])).toEqual([
      ['dashboard', 0],
      ['content', 0],
      ['entries', 1],
      ['media', 1],
      ['settings', 0],
      ['settings-general', 1],
      ['settings-team', 1],
      ['settings-billing', 1],
      ['invoices', 2],
    ]);
  });

  it('returns an empty list for an empty tree', () => {
    expect(flattenNav([])).toEqual([]);
  });

  it('carries the node itself, not a copy', () => {
    expect(flattenNav(tree)[0].node).toBe(tree[0]);
  });
});
