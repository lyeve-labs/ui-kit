import { describe, expect, it, vi } from 'vitest';
import { attempt, landing, type MoveCheck } from './reorder.js';

const page = ['Hero', 'Features', 'Pricing', 'Quotes', 'Footer'].map((label) => ({
  id: label.toLowerCase(),
  label,
}));

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('landing', () => {
  it.each([
    [2, 0, 0],
    [2, 1, 1],
    [2, 2, 2],
    [2, 3, 2],
    [2, 4, 3],
    [2, 5, 4],
    [0, 5, 4],
    [4, 0, 0],
  ])('a row from %i dropped in gap %i lands at %i', (from, gap, to) => {
    expect(landing(from, gap)).toBe(to);
  });
});

describe('attempt', () => {
  it.each([
    [0, 1, ['Features', 'Hero', 'Pricing', 'Quotes', 'Footer'], 'Hero moved to position 2 of 5.'],
    [3, 2, ['Hero', 'Features', 'Quotes', 'Pricing', 'Footer'], 'Quotes moved to position 3 of 5.'],
    [0, 4, ['Features', 'Pricing', 'Quotes', 'Footer', 'Hero'], 'Hero moved to position 5 of 5.'],
    [4, 0, ['Footer', 'Hero', 'Features', 'Pricing', 'Quotes'], 'Footer moved to position 1 of 5.'],
  ])('moves the row at %i to %i and says where it landed', (from, to, order, text) => {
    const result = attempt(page, from, to);
    expect(result).toMatchObject({ moved: true, to, text });
    expect(result.moved && labels(result.items)).toEqual(order);
  });

  it.each([
    [0, -1, 'Hero is already first.'],
    [4, 5, 'Footer is already last.'],
  ])('leaves the list alone past an end and says so', (from, to, text) => {
    expect(attempt(page, from, to)).toEqual({ moved: false, text });
  });

  it('says nothing for a move to where the row already is', () => {
    expect(attempt(page, 2, 2)).toEqual({ moved: false, text: '' });
  });

  it('never changes the list it was given', () => {
    const before = labels(page);
    attempt(page, 0, 3);
    expect(labels(page)).toEqual(before);
  });

  it("refuses with the consumer's own sentence", () => {
    const canMove = (item: { label: string }, _from: number, to: number): MoveCheck =>
      item.label === 'Footer' && to < 4 ? 'The footer stays last.' : true;
    expect(attempt(page, 4, 3, canMove)).toEqual({
      moved: false,
      text: 'The footer stays last.',
    });
    expect(attempt(page, 0, 1, canMove)).toMatchObject({ moved: true });
  });

  it('asks the check with the row and both positions, and only for a real move', () => {
    const canMove = vi.fn((): MoveCheck => true);
    attempt(page, 1, 3, canMove);
    expect(canMove).toHaveBeenCalledWith(page[1], 1, 3);
    canMove.mockClear();
    attempt(page, 0, -1, canMove);
    attempt(page, 2, 2, canMove);
    expect(canMove).not.toHaveBeenCalled();
  });
});
