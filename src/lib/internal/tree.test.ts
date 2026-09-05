import { describe, expect, it } from 'vitest';
import {
  branchState,
  flattenTree,
  isBranch,
  leavesOf,
  toggleSubtree,
  type TreeNode,
} from './tree.js';

/**
 * A checkable branch summarises its subtree and writes it, and the two have to
 * agree. These tests hold the cases where they come apart: a branch with
 * nothing it may write, a partly checked one, and a subtree with a row that is
 * counted but must never be written. They use plain nodes rather than a
 * rendered tree because the defect is in the arithmetic, not in the markup.
 */

const tree: TreeNode[] = [
  {
    id: 'docs',
    label: 'Docs',
    children: [
      {
        id: 'guide',
        label: 'Guide',
        children: [
          { id: 'install', label: 'Install' },
          { id: 'usage', label: 'Usage' },
        ],
      },
      { id: 'api', label: 'API' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    children: [
      { id: 'logo', label: 'Logo' },
      { id: 'draft', label: 'Draft', disabled: true },
    ],
  },
  { id: 'readme', label: 'Readme' },
];

const docs = tree[0];
const media = tree[1];
const readme = tree[2];

/** A branch whose every leaf is disabled: the empty branch case. */
const locked: TreeNode = {
  id: 'locked',
  label: 'Locked',
  children: [
    { id: 'a', label: 'A', disabled: true },
    { id: 'b', label: 'B', disabled: true },
  ],
};

const ids = (nodes: TreeNode[]) => nodes.map((n) => n.id);

describe('isBranch', () => {
  it('reads an empty children array as a leaf', () => {
    // A node that announces aria-expanded and opens onto nothing tells a screen
    // reader there is more to read when there is not.
    expect(isBranch({ id: 'x', label: 'X', children: [] })).toBe(false);
    expect(isBranch({ id: 'y', label: 'Y' })).toBe(false);
    expect(isBranch(docs)).toBe(true);
  });
});

describe('leavesOf', () => {
  it('returns a leaf as its own only leaf', () => {
    expect(ids(leavesOf(readme))).toEqual(['readme']);
  });

  it('collects every leaf under a branch, at any depth', () => {
    expect(ids(leavesOf(docs))).toEqual(['install', 'usage', 'api']);
  });

  it('excludes a disabled leaf, because it must be neither written nor counted', () => {
    expect(ids(leavesOf(media))).toEqual(['logo']);
  });

  it('stops at a disabled branch', () => {
    const node: TreeNode = {
      id: 'root',
      label: 'Root',
      children: [
        { id: 'off', label: 'Off', disabled: true, children: [{ id: 'hidden', label: 'Hidden' }] },
        { id: 'on', label: 'On' },
      ],
    };
    // Nothing under a disabled branch can be reached from an ancestor's
    // control, so counting it would describe a row the write skips.
    expect(ids(leavesOf(node))).toEqual(['on']);
  });

  it('returns nothing for a branch with no enabled leaves', () => {
    expect(leavesOf(locked)).toEqual([]);
  });
});

describe('branchState', () => {
  it('reports none for the empty branch case, not all', () => {
    // Assert the fold first, because it is the trap. Array.every is true over
    // an empty array, so a branch with no enabled leaves draws as fully checked
    // and the next click on it is a bulk write nobody asked for.
    const leaves = leavesOf(locked);
    expect(leaves.every((leaf) => new Set<string>().has(leaf.id))).toBe(true);
    expect(branchState(locked, new Set())).toBe('none');
  });

  it('reports mixed for a partial set', () => {
    expect(branchState(docs, new Set(['install']))).toBe('some');
    expect(branchState(docs, new Set(['install', 'usage']))).toBe('some');
  });

  it('reports none for an empty set and all when every enabled leaf is held', () => {
    expect(branchState(docs, new Set())).toBe('none');
    expect(branchState(docs, new Set(['install', 'usage', 'api']))).toBe('all');
  });

  it('reaches all without the disabled leaf', () => {
    // Waiting for `draft` would leave the branch permanently mixed, offering a
    // fill that can never complete.
    expect(branchState(media, new Set(['logo']))).toBe('all');
  });

  it('ignores a checked id that is not a leaf of this branch', () => {
    expect(branchState(media, new Set(['install', 'usage', 'api']))).toBe('none');
  });
});

describe('toggleSubtree', () => {
  it('writes every enabled leaf and skips the disabled one', () => {
    expect(toggleSubtree(media, new Set())).toEqual({ add: ['logo'], remove: [] });
  });

  it('fills from a partial state rather than clearing', () => {
    // A partial state usually means the operator is part way through granting.
    expect(toggleSubtree(docs, new Set(['install']))).toEqual({
      add: ['usage', 'api'],
      remove: [],
    });
  });

  it('clears only when every enabled leaf is already held', () => {
    expect(toggleSubtree(docs, new Set(['install', 'usage', 'api']))).toEqual({
      add: [],
      remove: ['install', 'usage', 'api'],
    });
  });

  it('never writes a branch id', () => {
    const { add } = toggleSubtree(docs, new Set());
    expect(add).not.toContain('docs');
    expect(add).not.toContain('guide');
  });

  it('writes nothing for a branch with no enabled leaves', () => {
    // The empty branch case again, on the write side: the state that reports
    // 'all' over zero rows is the state whose click clears, and this branch has
    // nothing it is allowed to clear.
    expect(toggleSubtree(locked, new Set())).toEqual({ add: [], remove: [] });
    expect(toggleSubtree(locked, new Set(['a', 'b']))).toEqual({ add: [], remove: [] });
  });

  it('returns only the ids whose state actually changes', () => {
    expect(toggleSubtree(docs, new Set(['install', 'usage']))).toEqual({
      add: ['api'],
      remove: [],
    });
  });

  it('leaves a disabled leaf alone even when it is somehow already checked', () => {
    expect(toggleSubtree(media, new Set(['logo', 'draft']))).toEqual({
      add: [],
      remove: ['logo'],
    });
  });
});

describe('flattenTree', () => {
  it('lists the roots when nothing is expanded', () => {
    const rows = flattenTree(tree, new Set());
    expect(rows.map((r) => r.node.id)).toEqual(['docs', 'media', 'readme']);
    expect(rows.every((r) => r.depth === 0)).toBe(true);
    expect(rows[0].parentId).toBeUndefined();
  });

  it('skips the children of a collapsed branch', () => {
    const rows = flattenTree(tree, new Set(['media']));
    expect(rows.map((r) => r.node.id)).toEqual(['docs', 'media', 'logo', 'draft', 'readme']);
  });

  it('carries the depth and the parent of every visible row', () => {
    const rows = flattenTree(tree, new Set(['docs', 'guide']));
    expect(rows.map((r) => [r.node.id, r.depth, r.parentId])).toEqual([
      ['docs', 0, undefined],
      ['guide', 1, 'docs'],
      ['install', 2, 'guide'],
      ['usage', 2, 'guide'],
      ['api', 1, 'docs'],
      ['media', 0, undefined],
      ['readme', 0, undefined],
    ]);
  });

  it('ignores an expanded id that names a leaf', () => {
    const rows = flattenTree(tree, new Set(['readme']));
    expect(rows.map((r) => r.node.id)).toEqual(['docs', 'media', 'readme']);
  });
});
