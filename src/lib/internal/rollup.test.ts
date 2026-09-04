import { describe, expect, it } from 'vitest';
import { nextState, rollUp, rollUpWithFloor, setSubtree, type TriState } from './rollup.js';

/**
 * A permissions matrix is one of the few surfaces where a wrong summary is not
 * a cosmetic defect: the summary decides what the next click writes. These
 * tests hold the cases that turn a correct summary into a silent bulk write,
 * and they use plain rows rather than a rendered component because the defect
 * is in the arithmetic, not in the markup.
 */

interface Row {
  id: string;
  granted: boolean;
  locked: boolean;
  inherited: boolean;
}

const row = (id: string, granted: boolean, locked = false, inherited = false): Row => ({
  id,
  granted,
  locked,
  inherited,
});

const isGranted = (r: Row) => r.granted;
const isSettable = (r: Row) => !r.locked;
const isInherited = (r: Row) => r.inherited;

describe('rollUp', () => {
  it('rolls the empty set up to none, not all', () => {
    // Assert first, because it is the whole reason the module exists. The fold
    // below is what shipped, and it is true here.
    const rows: Row[] = [];
    expect(rows.every(isGranted)).toBe(true);
    expect(rollUp(rows, isGranted)).toBe('none');
  });

  it.each<[string, boolean[], TriState]>([
    ['empty', [], 'none'],
    ['a single true element', [true], 'all'],
    ['a single false element', [false], 'none'],
    ['all true', [true, true, true], 'all'],
    ['all false', [false, false, false], 'none'],
    ['mixed, granted first', [true, false, false], 'some'],
    ['mixed, granted last', [false, false, true], 'some'],
    ['mixed, one short of all', [true, true, false], 'some'],
  ])('rolls %s up to %s', (_name, granted, expected) => {
    const rows = granted.map((g, i) => row(`p${i}`, g));
    expect(rollUp(rows, isGranted)).toBe(expected);
  });

  it('counts by the predicate, not by the row', () => {
    // The caller decides what granted means. A matrix column reads one field of
    // a row and a tree reads another, so the count must never look at the item.
    const rows = [row('a', false, false, true), row('b', false, false, true)];
    expect(rollUp(rows, isGranted)).toBe('none');
    expect(rollUp(rows, isInherited)).toBe('all');
  });
});

describe('nextState', () => {
  it('fills on some rather than clearing', () => {
    // The partial state most often means the operator is part way through
    // granting. Clearing there throws away the work they just did.
    expect(nextState('some')).toBe(true);
  });

  it.each<[TriState, boolean]>([
    ['none', true],
    ['some', true],
    ['all', false],
  ])('turns %s into a write of %s', (current, expected) => {
    expect(nextState(current)).toBe(expected);
  });
});

describe('setSubtree', () => {
  it('never emits an entry for an item that canSet rejects', () => {
    const rows = [row('a', false), row('b', false, true), row('c', false)];
    const writes = setSubtree(rows, true, isSettable);
    expect(writes.map((w) => w.item.id)).toEqual(['a', 'c']);
  });

  it.each<[string, boolean[], number]>([
    ['nothing settable', [true, true, true], 0],
    ['everything settable', [false, false, false], 3],
    ['one locked row', [false, true, false], 2],
    ['the empty subtree', [], 0],
  ])('emits one entry per settable row with %s', (_name, locked, expected) => {
    const rows = locked.map((l, i) => row(`p${i}`, false, l));
    const writes = setSubtree(rows, true, isSettable);
    expect(writes).toHaveLength(expected);
    expect(writes).toHaveLength(rows.filter(isSettable).length);
  });

  it.each([true, false])('carries the value %s onto every emitted entry', (value) => {
    const rows = [row('a', !value), row('b', !value)];
    expect(setSubtree(rows, value, isSettable).map((w) => w.value)).toEqual([value, value]);
  });

  it('leaves a locked row out of the roll-up that follows the write', () => {
    // A locked row that is counted turns a completed fill into 'some', and the
    // operator clicks again on a control that has nothing left to write.
    const rows = [row('a', false), row('b', false, true), row('c', false)];
    for (const w of setSubtree(rows, true, isSettable)) {
      w.item.granted = w.value;
    }
    expect(rollUp(rows.filter(isSettable), isGranted)).toBe('all');
    expect(rollUp(rows, isGranted)).toBe('some');
  });
});

describe('rollUpWithFloor', () => {
  it('rolls the empty set up to none, not all', () => {
    expect(rollUpWithFloor([], isGranted, isInherited)).toBe('none');
  });

  it('reports all for a row set that stores nothing but is entirely floored', () => {
    // An inherited grant cannot be revoked by clearing the stored row. A
    // control that reported 'none' here offered a clear that does nothing.
    const rows = [row('a', false, false, true), row('b', false, false, true)];
    expect(rollUp(rows, isGranted)).toBe('none');
    expect(rollUpWithFloor(rows, isGranted, isInherited)).toBe('all');
    expect(nextState(rollUpWithFloor(rows, isGranted, isInherited))).toBe(false);
  });

  it.each<[string, [boolean, boolean][], TriState]>([
    [
      'every row stored',
      [
        [true, false],
        [true, false],
      ],
      'all',
    ],
    [
      'every row floored',
      [
        [false, true],
        [false, true],
      ],
      'all',
    ],
    [
      'each row stored or floored',
      [
        [true, false],
        [false, true],
      ],
      'all',
    ],
    [
      'one row neither',
      [
        [true, false],
        [false, false],
      ],
      'some',
    ],
    [
      'no row either',
      [
        [false, false],
        [false, false],
      ],
      'none',
    ],
    ['a floored row alone', [[false, true]], 'all'],
  ])('reports %s as %s', (_name, pairs, expected) => {
    const rows = pairs.map(([granted, inherited], i) => row(`p${i}`, granted, false, inherited));
    expect(rollUpWithFloor(rows, isGranted, isInherited)).toBe(expected);
  });

  it('does not count a row twice when it is both stored and floored', () => {
    const rows = [row('a', true, false, true), row('b', false, false, false)];
    expect(rollUpWithFloor(rows, isGranted, isInherited)).toBe('some');
  });
});
