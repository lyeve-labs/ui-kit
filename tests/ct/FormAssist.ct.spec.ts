/**
 * FormAssist's suggestion bar in a real browser, where a preset plays. It
 * arrives and leaves as an Alert does, on the toast preset: base in, fast out.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Locator } from '@playwright/experimental-ct-svelte';
import FormAssistStory from './FormAssistStory.svelte';
import { styleWithKit } from './kit-css.js';
import { holdAt, pauseOnStart, pauseWhen, playing, resume, settled } from './motion.js';

const sources = ['FormAssist', 'Input', 'Button'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);

async function top(target: Locator): Promise<number> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target has no box');
  return box.y;
}

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
  await settled(bar);

  await page.getByRole('button', { name: 'Reject all' }).click();
  const exit = await playing(bar);
  expect(exit.map((a) => a.duration)).toEqual([120]);
  expect(exit[0].properties).toEqual(MOVES);
  await expect(bar).toHaveCount(0);
});

test('the form below moves with the bar, never jumping after it has gone', async ({
  mount,
  page,
}) => {
  await mount(FormAssistStory);
  await styleWithKit(page, 'dark', sources);
  const field = page.getByRole('textbox', { name: 'Name' });
  const form = page.locator('form');
  const atRest = await top(field);

  await pauseOnStart(page);
  await page.getByRole('button', { name: 'Suggest' }).click();
  await pauseWhen(form, 2);
  // At the first frame the bar holds no room, its gap included.
  await holdAt(form, 0);
  expect(await top(field)).toBe(atRest);
  await resume(form);
  const bar = page.getByRole('button', { name: 'Reject all' }).locator('xpath=../..');
  await settled(bar.locator('xpath=../..'));
  await settled(bar);
  const opened = await top(field);
  expect(opened).toBeGreaterThan(atRest);

  await page.getByRole('button', { name: 'Reject all' }).click();
  await pauseWhen(form, 2);
  // Halfway out, the form is on its way up, not waiting for the bar to go.
  await holdAt(form, 0.5);
  const halfway = await top(field);
  expect(halfway).toBeLessThan(opened);
  expect(halfway).toBeGreaterThan(atRest);
  await holdAt(form, 0.999);
  expect(Math.abs((await top(field)) - atRest)).toBeLessThan(1);
  await resume(form);
  await expect(bar).toHaveCount(0);
  expect(await top(field)).toBe(atRest);
});
