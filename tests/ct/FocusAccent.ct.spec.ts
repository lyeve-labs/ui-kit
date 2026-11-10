/**
 * The focus color is the brand-deep of the part of the page a control sits
 * in. Declared on the root as a variable of its own, it resolved there once,
 * so a frame that set a tenant's accent on a wrapper kept the kit's cyan rings
 * beside its own colors.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import FocusAccentStory from './FocusAccentStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = ['Button', 'SegmentedControl'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);

test('a focus ring takes the brand of the part of the page it sits in', async ({ mount, page }) => {
  await mount(FocusAccentStory);
  await styleWithKit(page, 'dark', SOURCES);

  await page.keyboard.press('Tab');
  const button = page.getByRole('button', { name: 'Save' });
  await expect(button).toBeFocused();
  // The button eases its colors, the outline's included, so read it once the
  // transition has settled.
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).outlineColor))
    .toBe('rgb(255, 0, 0)');

  await page.keyboard.press('Tab');
  const segment = page.getByRole('radio', { name: 'List' });
  await expect(segment).toBeFocused();
  await expect
    .poll(() => segment.evaluate((el) => getComputedStyle(el).boxShadow))
    .toContain('rgb(255, 0, 0)');
});
