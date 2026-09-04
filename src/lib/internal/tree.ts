/**
 * The shape of a data tree and the arithmetic a checkable one needs.
 *
 * A data tree is not a navigation menu. A menu shows where you can go and one
 * item is current; a tree shows a structure, and a branch in it summarises
 * everything beneath it while a click on that branch writes every one of them.
 * Those two jobs are the reason this module exists: the summary and the write
 * have to be computed from the same list, or a branch reports a state its own
 * click does not produce.
 *
 * The tri-state itself comes from rollup.ts rather than being written again
 * here. That module already holds the case a fold gets wrong, and a second
 * implementation of it would be a second chance to get it wrong.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

import type { Component } from 'svelte';
import { nextState, rollUp, setSubtree, type TriState } from './rollup.js';

/** Re-exported so a consumer of a branch's state does not have to know where the arithmetic lives. */
export type { TriState };

/** One node of a data tree. */
export interface TreeNode<T = unknown> {
  /** Stable across renders. */
  id: string;
  label: string;
  icon?: Component<{ size?: number; class?: string }>;
  children?: TreeNode<T>[];
  /** A count or status beside the label. */
  badge?: string | number;
  disabled?: boolean;
  /** Whatever the consumer needs on activation. */
  data?: T;
}

/** One visible row, in the order a keyboard walks them. */
export interface TreeRow<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  parentId?: string;
}

/**
 * Whether a node has anything to descend into.
 *
 * An empty `children` array is a leaf, not a branch that happens to be empty.
 * A node that announces `aria-expanded` and then opens onto nothing tells a
 * screen reader user there is more to read when there is not.
 */
export function isBranch<T>(node: TreeNode<T>): boolean {
  return (node.children?.length ?? 0) > 0;
}

/**
 * Every leaf under a node, disabled ones included, so the write and the count
 * can be taken from one list.
 *
 * The walk stops at a disabled branch. Nothing in the subtree below it can be
 * reached from any ancestor's control, so counting those leaves would describe
 * rows the write skips.
 */
function walkLeaves<T>(node: TreeNode<T>, out: TreeNode<T>[]): void {
  if (!isBranch(node)) {
    out.push(node);
    return;
  }
  if (node.disabled) return;
  for (const child of node.children ?? []) walkLeaves(child, out);
}

/** Every leaf under a node, excluding disabled ones, because a disabled leaf must be neither written nor counted. */
export function leavesOf<T>(node: TreeNode<T>): TreeNode<T>[] {
  const reachable: TreeNode<T>[] = [];
  walkLeaves(node, reachable);
  return reachable.filter((leaf) => !leaf.disabled);
}

/**
 * The tri-state of a branch, from the checked set.
 *
 * A leaf is its own only leaf, so a caller can ask this of any node and get an
 * answer that matches what a click on it will do. A branch whose leaves are all
 * disabled has none to count and reports 'none': `leaves.every(isChecked)` is
 * true over an empty array, which would draw that branch as fully checked and
 * make the next click on it clear rows nobody chose.
 */
export function branchState<T>(node: TreeNode<T>, checked: ReadonlySet<string>): TriState {
  return rollUp(leavesOf(node), (leaf) => checked.has(leaf.id));
}

/**
 * The ids to add and remove to set a whole subtree.
 *
 * Only leaf ids are ever returned. A branch's state is derived from its leaves
 * on every render, so storing the branch as well gives the two a way to
 * disagree, and the stored one always wins on the next paint.
 *
 * The direction is decided by counting the same list the write is filtered
 * from, which is what keeps a partly disabled branch honest: the state that
 * says 'fill' cannot have counted a leaf the fill will skip.
 */
export function toggleSubtree<T>(
  node: TreeNode<T>,
  checked: ReadonlySet<string>,
): { add: string[]; remove: string[] } {
  const reachable: TreeNode<T>[] = [];
  walkLeaves(node, reachable);

  const settable = (leaf: TreeNode<T>) => !leaf.disabled;
  const value = nextState(rollUp(reachable.filter(settable), (leaf) => checked.has(leaf.id)));

  const add: string[] = [];
  const remove: string[] = [];
  for (const write of setSubtree(reachable, value, settable)) {
    const held = checked.has(write.item.id);
    if (write.value && !held) add.push(write.item.id);
    if (!write.value && held) remove.push(write.item.id);
  }
  return { add, remove };
}

/**
 * The visible rows, in order, with the depth and parent each one needs.
 *
 * A collapsed branch contributes its own row and nothing below it. The arrow
 * keys walk this list, so a row that is not in it cannot be reached by keyboard
 * either, which is the only way the keyboard order and the painted order stay
 * the same list.
 */
export function flattenTree<T>(nodes: TreeNode<T>[], expanded: ReadonlySet<string>): TreeRow<T>[] {
  const rows: TreeRow<T>[] = [];

  const visit = (list: TreeNode<T>[], depth: number, parentId?: string) => {
    for (const node of list) {
      rows.push(parentId === undefined ? { node, depth } : { node, depth, parentId });
      if (isBranch(node) && expanded.has(node.id)) {
        visit(node.children ?? [], depth + 1, node.id);
      }
    }
  };

  visit(nodes, 0);
  return rows;
}
