/**
 * The accordion is built on details, so the browser opens and closes each
 * item and a page with no script works the same. Its items share one name,
 * so opening one closes the other unless several may stay open.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import AccordionItems from '../fixtures/AccordionItems.svelte';
import AccordionNestStory from './AccordionNestStory.svelte';
import { styleWithKit } from './kit-css.js';

test('opening one item closes the other', async ({ mount, page }) => {
  await mount(AccordionItems);
  const [first, second] = [page.locator('details').nth(0), page.locator('details').nth(1)];
  await page.getByText('What is included?').click();
  await expect(first).toHaveJSProperty('open', true);
  await expect(page.getByText('Every block.')).toBeVisible();
  await page.getByText('Can I cancel?').click();
  await expect(second).toHaveJSProperty('open', true);
  await expect(first).toHaveJSProperty('open', false);
  await expect(page.getByText('Every block.')).toBeHidden();
});

test('opens and shuts from the keyboard', async ({ mount, page }) => {
  await mount(AccordionItems);
  const first = page.locator('details').nth(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary').nth(0)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(first).toHaveJSProperty('open', true);
  await page.keyboard.press('Space');
  await expect(first).toHaveJSProperty('open', false);
});

test('lets several stay open when multiple is set', async ({ mount, page }) => {
  await mount(AccordionItems, { props: { multiple: true } });
  await page.getByText('What is included?').click();
  await page.getByText('Can I cancel?').click();
  await expect(page.getByText('Every block.')).toBeVisible();
  await expect(page.getByText('At any time.')).toBeVisible();
});

// Chromium hides a shut body without dropping its style, so an entrance set
// at all times plays at most once and never at a later opening.
test('fades the body in at every opening', async ({ mount, page }) => {
  await mount(AccordionItems);
  await styleWithKit(page, 'dark');
  const summary = page.getByText('What is included?');
  const body = page.getByText('Every block.');
  const entrances = () =>
    body.evaluate((el) => el.getAnimations().filter((a) => a instanceof CSSAnimation).length);
  await summary.click();
  expect(await entrances()).toBe(1);
  await body.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  expect(await entrances()).toBe(0);
  await summary.click();
  await summary.click();
  expect(await entrances()).toBe(1);
});

test('draws an item shut inside an open item', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(AccordionNestStory);
  await styleWithKit(page, 'dark');
  const [outer, inner] = [page.locator('summary').nth(0), page.locator('summary').nth(1)];
  const look = (summary: typeof outer) =>
    summary.evaluate((el) => ({
      fill: getComputedStyle(el).backgroundColor,
      chevron: getComputedStyle(el.querySelector('svg')!).rotate,
    }));
  const shut = await look(outer);
  await outer.click();
  await page.mouse.move(0, 0);
  await expect.poll(() => look(outer)).not.toEqual(shut);
  await expect.poll(() => look(inner)).toEqual(shut);
});
