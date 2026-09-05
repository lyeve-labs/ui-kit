/**
 * Which groups in a sidebar are open, and why.
 *
 * Expansion looks like one boolean per group and is really three sources
 * disagreeing: the tree says a group ships open, the current page says its
 * ancestors have to be open or the reader cannot see where they are, and the
 * reader says they closed that group and meant it. A component that keeps a
 * flat set of open ids loses the third one the moment the second changes,
 * which is how a group reopens itself every time the reader navigates inside
 * it.
 *
 * So the state here is not "open ids". It is the decisions the reader has
 * made, which are the only part worth persisting, and a default computed from
 * the tree and the path underneath them. A reader decision always wins, and
 * until there is one the group follows the page.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

import { activeTrail, flattenNav, type NavTree } from './nav-tree.js';

export interface NavExpansionOptions {
  items: () => NavTree;
  activePath: () => string;
  /** Open the ancestors of the current page. */
  expandActive: () => boolean;
  /** Only one group open at a time. */
  exclusive: () => boolean;
  /** localStorage key. Undefined keeps expansion in memory. */
  storageKey: () => string | undefined;
}

export interface NavExpansion {
  readonly isExpanded: (id: string) => boolean;
  toggle(id: string): void;
  expand(id: string): void;
  collapse(id: string): void;
}

/**
 * localStorage is absent on the server and throws on access in a private
 * window and wherever the reader has blocked site data, so it is reached for
 * behind both a typeof guard and a catch. Expansion is a convenience; nothing
 * here may be the reason a sidebar fails to render.
 */
function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function readStored(key: string | undefined): Record<string, boolean> {
  if (!key) return {};

  const store = storage();
  if (!store) return {};

  try {
    const raw = store.getItem(key);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    // Another version of the app, or a reader editing the value by hand, can
    // leave anything at all under this key. Only booleans survive the read.
    const out: Record<string, boolean> = {};
    for (const [id, open] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof open === 'boolean') out[id] = open;
    }
    return out;
  } catch {
    return {};
  }
}

function writeStored(key: string | undefined, value: Record<string, boolean>): void {
  if (!key) return;

  const store = storage();
  if (!store) return;

  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // A private window answers a write with a quota error. The session keeps
    // its expansion in memory instead.
  }
}

function hasChildren(node: { children?: unknown[] }): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

export function createNavExpansion(options: NavExpansionOptions): NavExpansion {
  // Read once, with the key the sidebar mounted with. A key that changes later
  // names a different sidebar, which is a different component instance.
  const key = options.storageKey();

  /** The reader's own decisions. An id absent here has not been decided. */
  let overrides = $state<Record<string, boolean>>(readStored(key));

  const trail = $derived(
    options.expandActive()
      ? new Set(activeTrail(options.items(), options.activePath()))
      : new Set<string>(),
  );

  const nodes = $derived(flattenNav(options.items()));

  function commit(next: Record<string, boolean>): void {
    overrides = next;
    writeStored(key, next);
  }

  function ancestorsOf(id: string): string[] {
    const walk = (branch: NavTree, chain: string[]): string[] | undefined => {
      for (const node of branch) {
        if (node.id === id) return chain;
        if (node.children && node.children.length > 0) {
          const found = walk(node.children, [...chain, node.id]);
          if (found) return found;
        }
      }
      return undefined;
    };
    return walk(options.items(), []) ?? [];
  }

  function isExpanded(id: string): boolean {
    if (Object.prototype.hasOwnProperty.call(overrides, id)) return overrides[id];
    if (nodes.some((entry) => entry.node.id === id && entry.node.defaultExpanded)) return true;
    return trail.has(id);
  }

  function expand(id: string): void {
    if (!options.exclusive()) {
      commit({ ...overrides, [id]: true });
      return;
    }

    // Exclusive closes every other group, except the ones the opened node sits
    // inside: collapsing an ancestor would hide the group that was just asked
    // for. Ids the tree no longer holds keep whatever they had, so a stored
    // key survives a tree that has not finished loading.
    const keep = new Set([id, ...ancestorsOf(id)]);
    const next: Record<string, boolean> = { ...overrides };
    for (const { node } of nodes) {
      if (hasChildren(node)) next[node.id] = keep.has(node.id);
    }
    commit(next);
  }

  function collapse(id: string): void {
    // Descendants keep their own decisions. They are not on screen while this
    // group is shut, and reopening it should restore what the reader left.
    commit({ ...overrides, [id]: false });
  }

  function toggle(id: string): void {
    if (isExpanded(id)) {
      collapse(id);
    } else {
      expand(id);
    }
  }

  return { isExpanded, toggle, expand, collapse };
}
