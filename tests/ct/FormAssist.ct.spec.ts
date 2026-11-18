/**
 * FormAssist's suggestion bar in a real browser, where a preset plays. It
 * arrives and leaves as an Alert does, on the toast preset: base in, fast out.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import FormAssistStory from './FormAssistStory.svelte';
import { playing } from './motion.js';

const MOVES = ['opacity', 'transform'];

test('the suggestion bar enters on the base rung and leaves one rung faster', async ({
  mount,
  page,
}) => {
  await mount(FormAssistStory);
  await page.getByRole('button', { name: 'Suggest' }).click();
  const bar = page.getByRole('button', { name: 'Reject all' }).locator('xpath=../..');

  const enter = await playing(bar);
  expect(enter.map((a) => a.duration)).toEqual([200]);
  expect(enter[0].properties).toEqual(MOVES);
  expect(enter[0].from.opacity).toBe('0');

  await page.getByRole('button', { name: 'Reject all' }).click();
  const exit = await playing(bar);
  expect(exit.map((a) => a.duration)).toEqual([120]);
  expect(exit[0].properties).toEqual(MOVES);
  await expect(bar).toHaveCount(0);
});
