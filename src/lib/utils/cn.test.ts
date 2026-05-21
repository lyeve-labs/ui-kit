import { describe, expect, it } from 'vitest';
import { cn } from './cn.js';

describe('cn', () => {
  it('joins string args with a single space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', null, undefined, false, 0, '', 'b')).toBe('a b');
  });

  it('inlines arrays recursively', () => {
    expect(cn('a', ['b', ['c', 'd']], 'e')).toBe('a b c d e');
  });

  it('reads object entries as { class: bool } maps', () => {
    expect(cn('a', { b: true, c: false, d: true })).toBe('a b d');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(null, undefined, false, '', { a: false })).toBe('');
  });

  it('coerces numbers to strings', () => {
    expect(cn(1, 'col-2', 0)).toBe('1 col-2');
  });
});
