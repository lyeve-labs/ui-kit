/**
 * Button heights, measured in the pixels a reader sees.
 *
 * A filled button drew 2px shorter than an outlined one beside it, because
 * only the outlined variants carried a border. Every variant at one size has
 * to draw one height, and the default size has to match the input beside it.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import ButtonHeightsStory from './ButtonHeightsStory.svelte';
import { styleWithKit } from './kit-css.js';

const VARIANTS = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'];
const SIZES = ['sm', 'md', 'lg', 'icon'];

test('draws every variant at one height per size, and md level with the input', async ({
  mount,
  page,
}) => {
  const story = await mount(ButtonHeightsStory);
  await styleWithKit(page, 'dark');
  const heights: Record<string, Record<string, number>> = {};
  for (const size of SIZES) {
    heights[size] = {};
    for (const variant of VARIANTS) {
      const box = await story.getByTestId(`${size}-${variant}`).boundingBox();
      heights[size][variant] = box!.height;
    }
  }
  const input = await story.getByTestId('input').getByRole('textbox').boundingBox();
  for (const size of SIZES) {
    const first = heights[size].primary;
    expect({ size, heights: heights[size] }).toEqual({
      size,
      heights: Object.fromEntries(VARIANTS.map((v) => [v, first])),
    });
  }
  expect(heights.md.primary).toBe(input!.height);
  expect(heights.icon.ghost).toBe(32);
});
