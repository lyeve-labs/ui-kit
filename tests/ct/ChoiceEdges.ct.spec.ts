/**
 * An empty box or ring rests on line-strong at 60% and firms to line-strong
 * under the pointer. An option card rests on the soft line, firms under the
 * pointer, and a selected card is a tint with no brand edge. The input covers
 * a card, so the card's hover is a peer's, which only the compiled sheet can
 * prove.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import ChoiceEdgesStory from './ChoiceEdgesStory.svelte';
import { styleWithKit } from './kit-css.js';

const LINE = 'rgb(25, 42, 61)';
const LINE_STRONG = 'rgb(97, 109, 128)';

const top = (el: Element) => getComputedStyle(el).borderTopColor;

/** The alpha of a computed color, which Chromium writes last after a slash. */
const alpha = (color: string) => Number(/\/ ([\d.]+)\)$/.exec(color)?.[1] ?? 1);

test('an empty box rests at 60% and firms under the pointer', async ({ mount, page }) => {
  await mount(ChoiceEdgesStory);
  await styleWithKit(page, 'dark');

  const input = page.getByRole('checkbox', { name: 'Remember me' });
  const box = input.locator('xpath=following-sibling::span[1]');
  await expect.poll(() => box.evaluate(top).then(alpha)).toBe(0.6);
  await input.hover();
  await expect.poll(() => box.evaluate(top)).toBe(LINE_STRONG);
});

test('an empty radio ring rests at 60%, the way an empty box does', async ({ mount, page }) => {
  await mount(ChoiceEdgesStory);
  await styleWithKit(page, 'dark');

  const ring = page
    .getByRole('radio', { name: 'Solo' })
    .locator('xpath=following-sibling::span[1]');
  await expect.poll(() => ring.evaluate(top).then(alpha)).toBe(0.6);
});

test('a card rests on the soft line and firms under the pointer', async ({ mount, page }) => {
  await mount(ChoiceEdgesStory);
  await styleWithKit(page, 'dark');

  const input = page.getByRole('checkbox', { name: /^Content/ });
  const card = input.locator('xpath=following-sibling::span[1]');
  await expect.poll(() => card.evaluate(top)).toBe(LINE);
  await input.hover();
  await expect.poll(() => card.evaluate(top)).toBe(LINE_STRONG);
});

test('a selected card is a tint on the soft line, with no brand edge', async ({ mount, page }) => {
  await mount(ChoiceEdgesStory);
  await styleWithKit(page, 'dark');

  const card = page
    .getByRole('checkbox', { name: /^Media/ })
    .locator('xpath=following-sibling::span[1]');
  const empty = page
    .getByRole('checkbox', { name: /^Content/ })
    .locator('xpath=following-sibling::span[1]');
  await expect.poll(() => card.evaluate(top)).toBe(LINE);
  const fill = (el: Element) => getComputedStyle(el).backgroundColor;
  expect(await card.evaluate(fill)).not.toBe(await empty.evaluate(fill));
});
