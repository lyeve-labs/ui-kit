/**
 * FormMessage in a real browser, where a preset plays. The outcome arrives
 * and leaves as an Alert does, on the toast preset, while the live region
 * around it is the element the page mounts.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import FormMessageStory from './FormMessageStory.svelte';
import { playing, settled } from './motion.js';

const MOVES = ['opacity', 'transform'];

test('the outcome enters on the base rung and leaves one rung faster', async ({ mount, page }) => {
  await mount(FormMessageStory);
  await page.getByRole('button', { name: 'Toggle' }).click();
  const region = page.locator('[aria-live]');
  const outcome = region.locator('> *');
  await expect(outcome).toHaveText('Settings saved.');

  const enter = await playing(outcome);
  expect(enter.map((a) => a.duration)).toEqual([200]);
  expect(enter[0].properties).toEqual(MOVES);
  expect(enter[0].from.opacity).toBe('0');
  await settled(outcome);
  expect(await playing(region)).toEqual([]);

  await page.getByRole('button', { name: 'Toggle' }).click();
  const exit = await playing(outcome);
  expect(exit.map((a) => a.duration)).toEqual([120]);
  expect(exit[0].properties).toEqual(MOVES);
  await expect(region).toHaveCount(0);
});
