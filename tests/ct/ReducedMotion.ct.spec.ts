/**
 * The theme's reduced-motion block in a real browser. A reader who asked for
 * less motion gets every state change at once. A delay is choreography, and
 * without the travel it choreographs nothing: staggered content would sit
 * invisible for the whole delay and then appear.
 */

import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/experimental-ct-svelte';
import ReducedMotionStory from './ReducedMotionStory.svelte';
import { styleWithKit } from './kit-css.js';

const story = fileURLToPath(new URL('./ReducedMotionStory.svelte', import.meta.url));

test('drops every delay under reduced motion, so staggered content shows at once', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(ReducedMotionStory);
  await styleWithKit(page, 'dark', [story]);
  const enters = page.getByTestId('enters');
  const fades = page.getByTestId('fades');

  // Read in the same task as the change, well inside the 600ms the page asked
  // for, so a delay that survived would still hold the content at opacity 0.
  const entered = await enters.evaluate(
    (el) =>
      new Promise<string>((done) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => done(getComputedStyle(el).opacity)),
        ),
      ),
  );
  expect(entered).toBe('1');
  await page.getByRole('button', { name: 'Show' }).click();
  const faded = await fades.evaluate(
    (el) =>
      new Promise<string>((done) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => done(getComputedStyle(el).opacity)),
        ),
      ),
  );
  expect(faded).toBe('1');

  const delays = (target: typeof enters) =>
    target.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.animationDelay, style.transitionDelay];
    });
  expect(await delays(enters)).toEqual(['0s', '0s']);
  expect(await delays(fades)).toEqual(['0s', '0s']);
});

test('keeps the delays a page asked for when motion is welcome', async ({ mount, page }) => {
  await mount(ReducedMotionStory);
  await styleWithKit(page, 'dark', [story]);
  const enters = page.getByTestId('enters');
  expect(await enters.evaluate((el) => getComputedStyle(el).animationDelay)).toBe('0.6s');
  expect(
    await page.getByTestId('fades').evaluate((el) => getComputedStyle(el).transitionDelay),
  ).toBe('0.6s');
});
