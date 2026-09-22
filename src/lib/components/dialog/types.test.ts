import { describe, expect, it } from 'vitest';
import { OVERLAY_WIDTH } from '../../internal/layout.js';
import { sizeClass, type DialogSize } from './types.js';

describe('sizeClass', () => {
  const sizes: DialogSize[] = ['sm', 'md', 'lg', 'xl', 'full'];

  it.each(sizes)('hands size "%s" the shared overlay rung', (size) => {
    // Asserted against the ladder rather than against a class spelled out
    // here. The dialog stack, Modal and Drawer are one ladder now, and a copy
    // of the mapping in a test is how the three drifted apart to begin with.
    expect(sizeClass(size)).toBe(OVERLAY_WIDTH[size]);
  });

  it('answers every rung the ladder declares', () => {
    expect(sizes.map(sizeClass).sort()).toEqual(Object.values(OVERLAY_WIDTH).sort());
  });
});
