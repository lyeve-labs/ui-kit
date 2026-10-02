import { describe, expect, it } from 'vitest';
import { betaOf, billedCount, formatCents, ladderRows, ladderState } from './pricing';

const BRACKETS = [
  { plugins: 3, discount_pct: 5 },
  { plugins: 5, discount_pct: 10 },
  { plugins: 10, discount_pct: 25 },
];

describe('ladderState', () => {
  it('reaches no discount below the first rung', () => {
    const l = ladderState(BRACKETS, 2);
    expect(l.reachedPct).toBe(0);
    expect(l.active).toBe(-1);
    expect(l.next).toEqual({ plugins: 3, discount_pct: 5, more: 1 });
  });

  it('stands on the highest rung the count has passed', () => {
    const l = ladderState(BRACKETS, 7);
    expect(l.reachedPct).toBe(10);
    expect(l.active).toBe(1);
    expect(l.next).toEqual({ plugins: 10, discount_pct: 25, more: 3 });
  });

  it('has no next rung at the top', () => {
    expect(ladderState(BRACKETS, 12).next).toBeNull();
    expect(ladderState(BRACKETS, 12).reachedPct).toBe(25);
  });

  it('reads an unsorted ladder the same way', () => {
    const shuffled = [BRACKETS[2], BRACKETS[0], BRACKETS[1]];
    expect(ladderState(shuffled, 7)).toEqual(ladderState(BRACKETS, 7));
  });

  it('survives an empty ladder', () => {
    expect(ladderState([], 4)).toEqual({ count: 4, reachedPct: 0, next: null, active: -1 });
  });
});

describe('billedCount', () => {
  it('counts the cart when nothing is held', () => {
    expect(billedCount({ selected: ['a', 'b'] })).toBe(2);
  });

  it('counts held and added together for a change', () => {
    expect(billedCount({ selected: ['c'], held: ['a', 'b'], change: true })).toBe(3);
  });

  it('never counts one capability twice', () => {
    expect(billedCount({ selected: ['a'], held: ['a', 'b'], change: true })).toBe(2);
  });

  it('prefers the server count once the change has been priced', () => {
    expect(
      billedCount({ selected: ['c'], held: ['a'], change: true, pricedSkus: ['a', 'b', 'c'] }),
    ).toBe(3);
  });
});

describe('ladderRows', () => {
  it('labels each rung by the range it covers, and the last one openly', () => {
    expect(ladderRows(BRACKETS)).toEqual([
      { from: 3, to: 4, discount_pct: 5 },
      { from: 5, to: 9, discount_pct: 10 },
      { from: 10, to: null, discount_pct: 25 },
    ]);
  });
});

describe('formatCents', () => {
  it('prints whole and part cents with two places', () => {
    expect(formatCents(800)).toBe('$8.00');
    expect(formatCents(1)).toBe('$0.01');
    expect(formatCents(0)).toBe('$0.00');
  });

  it('formats another currency by its own symbol', () => {
    expect(formatCents(1500, 'EUR')).toContain('15.00');
  });
});

describe('betaOf', () => {
  it('lifts a trailing "Beta." out of the text and into the flag', () => {
    expect(betaOf('Multi-locale content. Beta.')).toEqual({ text: 'Multi-locale content.', beta: true });
  });

  it('lifts a "Beta." sentence from the middle as well', () => {
    expect(betaOf('Per-field translations. Beta. Without it the engine serves one locale.')).toEqual({
      text: 'Per-field translations. Without it the engine serves one locale.',
      beta: true,
    });
  });

  it('flags a "Beta:" caveat and keeps the caveat, which carries information', () => {
    expect(betaOf('SAML single sign-on. Beta: IdP-initiated flows only.')).toEqual({
      text: 'SAML single sign-on. Beta: IdP-initiated flows only.',
      beta: true,
    });
  });

  it('leaves any other blurb as it came', () => {
    expect(betaOf('The API transport is beta.')).toEqual({ text: 'The API transport is beta.', beta: false });
    expect(betaOf(undefined)).toEqual({ text: '', beta: false });
  });
});
