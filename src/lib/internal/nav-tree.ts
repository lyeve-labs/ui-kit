/**
 * How a sidebar decides which of its links is the current page.
 *
 * The rule every app shell reaches for is
 *
 *     pathname === href || pathname.startsWith(href + '/')
 *
 * applied to every entry in the list. It is wrong in two ways that only show
 * up once the list has more than one level. A parent link keeps claiming the
 * page while the reader is on one of its children, so a settings sub-page
 * lights two rows at once and neither of them is where the reader is. And two
 * leaves where one href is a prefix of the other, /settings beside
 * /settings/team, mark themselves together for the same reason, even though
 * they are siblings and only one of them can be open.
 *
 * The fix is that prefix matching is a property of a node that owns a section,
 * not of every node. A leaf answers for its own path and nothing below it; a
 * node with children answers for its whole subtree, because that is what makes
 * an ancestor able to say "you are somewhere in here" while its child says
 * "you are here". Either default is overridable per node, and 'none' opts a
 * node out of path matching entirely.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

import type { Component } from 'svelte';
import type { AccentTone } from './tone.js';

export interface NavNode {
  /** Stable across renders. aria-controls is built from it and an each is keyed by it. */
  id: string;
  label: string;
  href?: string;
  icon?: Component<{ size?: number; class?: string }>;
  children?: NavNode[];
  /** A count or status beside the label. */
  badge?: string | number;
  badgeTone?: AccentTone;
  /** Open on first render. */
  defaultExpanded?: boolean;
  /** How activePath matches. Defaults to 'exact' for a leaf and 'prefix' for a node with children. */
  match?: 'exact' | 'prefix' | 'none';
  disabled?: boolean;
}

export type NavTree = NavNode[];

/**
 * Trailing slashes are noise: a router hands over /settings on one route and
 * /settings/ on another, and the two name the same page. Everything else is
 * left alone, because activePath is documented as a pathname and a query or a
 * hash that reached here is a caller bug worth seeing rather than absorbing.
 */
function normalize(path: string): string {
  if (path === '') return '';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * A node with children owns a section, so it answers for everything under it.
 * A leaf answers for its own path alone.
 */
function matchMode(node: NavNode): 'exact' | 'prefix' | 'none' {
  if (node.match) return node.match;
  return node.children && node.children.length > 0 ? 'prefix' : 'exact';
}

/**
 * True when this node is the current page.
 *
 * Path only. A disabled node still reports the truth about its href; whether
 * it is rendered as a link is a separate decision the component makes.
 */
export function isActive(node: NavNode, activePath: string): boolean {
  if (!node.href) return false;

  const mode = matchMode(node);
  if (mode === 'none') return false;

  const href = normalize(node.href);
  const path = normalize(activePath);
  if (href === '' || path === '') return false;

  if (path === href) return true;
  // A root href normalizes to "/", so the prefix it tests for is "//" and it
  // claims nothing but itself. A dashboard mounted at / would otherwise own
  // every page in the app.
  return mode === 'prefix' && path.startsWith(`${href}/`);
}

/**
 * The ids from the root down to the matched leaf, so its ancestors can open
 * and mark themselves.
 *
 * Children are searched before the node itself, so a group never shadows the
 * child that holds the more specific answer. The first match in document order
 * wins: two nodes claiming one path is a tree the author has to fix, and
 * silently picking one of them by length would hide it.
 */
export function activeTrail(items: NavTree, activePath: string): string[] {
  for (const node of items) {
    if (node.children && node.children.length > 0) {
      const below = activeTrail(node.children, activePath);
      if (below.length > 0) return [node.id, ...below];
    }
    if (isActive(node, activePath)) return [node.id];
  }
  return [];
}

/** Depth-first flatten, for tests and for keyboard order. */
export function flattenNav(items: NavTree): { node: NavNode; depth: number }[] {
  const out: { node: NavNode; depth: number }[] = [];

  const walk = (nodes: NavTree, depth: number): void => {
    for (const node of nodes) {
      out.push({ node, depth });
      if (node.children && node.children.length > 0) walk(node.children, depth + 1);
    }
  };

  walk(items, 0);
  return out;
}
