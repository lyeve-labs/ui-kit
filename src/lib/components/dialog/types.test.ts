import { describe, expect, it } from 'vitest';
import { sizeClass, type DialogSize } from './types.js';

describe('sizeClass', () => {
  const cases: Array<[DialogSize, string]> = [
    ['sm', 'max-w-sm'],
    ['md', 'max-w-md'],
    ['lg', 'max-w-lg'],
    ['xl', 'max-w-xl'],
    ['full', 'max-w-3xl'],
  ];

  it.each(cases)('maps size "%s" → "%s"', (size, expected) => {
    expect(sizeClass(size)).toBe(expected);
  });
});
