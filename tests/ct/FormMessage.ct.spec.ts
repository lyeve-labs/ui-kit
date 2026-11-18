/**
 * FormMessage in a real browser, where a preset plays. The outcome arrives
 * and leaves as an Alert does, on the toast preset, while the live region
 * around it is the element the page mounts.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Locator } from '@playwright/experimental-ct-svelte';
import FormMessageStory from './FormMessageStory.svelte';
import { styleWithKit } from './kit-css.js';
import { holdAt, pauseOnStart, pauseWhen, playing, resume, settled } from './motion.js';

const sources = ['../../src/lib/components/FormMessage.svelte', './FormMessageStory.svelte'].map(
  (path) => fileURLToPath(new URL(path, import.meta.url)),
);

async function top(target: Locator): Promise<number> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target has no box');
  return box.y;
}

const MOVES = ['opacity', 'transform'];

test('the outcome enters on the base rung and leaves one rung faster', async ({ mount, page }) => {
  await mount(FormMessageStory);
  await pauseOnStart(page);
  await page.getByRole('button', { name: 'Toggle' }).click();
  const region = page.locator('[aria-live]');
  const outcome = region.locator('p').locator('..');
  await expect(outcome).toHaveText('Settings saved.');
  await pauseWhen(region, 2);

  const enter = await playing(outcome);
  expect(enter.map((a) => a.duration)).toEqual([200]);
  expect(enter[0].properties).toEqual(MOVES);
  expect(enter[0].from.opacity).toBe('0');
  await resume(region);
  await settled(region.locator('> *'));
  await settled(outcome);
  expect(await playing(region)).toEqual([]);

  await page.getByRole('button', { name: 'Toggle' }).click();
  await pauseWhen(region, 2);
  const exit = await playing(outcome);
  expect(exit.map((a) => a.duration)).toEqual([120]);
  expect(exit[0].properties).toEqual(MOVES);
  await resume(region);
  await expect(region).toHaveCount(0);
});

for (const layout of ['block', 'gap'] as const) {
  test(`in a ${layout} flow the content below moves with the message as it arrives and as the page drops it`, async ({
    mount,
    page,
  }) => {
    await mount(FormMessageStory, { props: { layout } });
    await styleWithKit(page, 'dark', sources);
    const below = page.getByText('Below the message');
    const atRest = await top(below);

    await pauseOnStart(page);
    await page.getByRole('button', { name: 'Toggle' }).click();
    const region = page.locator('[aria-live]');
    const mounted = await region.elementHandle();
    await pauseWhen(region, 2);
    // The region is the row, and its text arrives two frames after it. At the
    // first frame the content below has not moved, the column's gap included.
    await holdAt(region, 0);
    expect(await top(below)).toBe(atRest);
    await holdAt(region, 0.5);
    const halfway = await top(below);
    await resume(region);
    await settled(region);
    await settled(region.locator('> * > *'));
    const opened = await top(below);
    expect(halfway).toBeGreaterThan(atRest);
    expect(halfway).toBeLessThan(opened);
    // The region holds the text, and is the element the page mounted.
    await expect(region).toHaveText('Settings saved.');
    expect(await mounted!.evaluate((el) => el.isConnected)).toBe(true);

    await page.getByRole('button', { name: 'Toggle' }).click();
    await pauseWhen(region, 2);
    await holdAt(region, 0.5);
    const leaving = await top(below);
    expect(leaving).toBeLessThan(opened);
    expect(leaving).toBeGreaterThan(atRest);
    await holdAt(region, 0.999);
    expect(Math.abs((await top(below)) - atRest)).toBeLessThan(1);
    await resume(region);
    await expect(region).toHaveCount(0);
    expect(await top(below)).toBe(atRest);
  });
}
