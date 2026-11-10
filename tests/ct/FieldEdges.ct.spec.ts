/**
 * Every field rests on the soft line and firms to line-strong under the
 * pointer, and focus keeps its own border. Tailwind emits focus-within and
 * has- variants before hover, so a frame focused through a part inside it is
 * the case a class check cannot prove: only the compiled sheet says which
 * rule wins.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import FieldEdgesStory from './FieldEdgesStory.svelte';
import { styleWithKit } from './kit-css.js';

const LINE = 'rgb(25, 42, 61)';
const LINE_STRONG = 'rgb(97, 109, 128)';
const FOCUS = 'rgb(0, 153, 196)';

const top = (el: Element) => getComputedStyle(el).borderTopColor;

test('a field rests soft, firms under the pointer and keeps its focus border', async ({
  mount,
  page,
}) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const name = page.getByLabel('Name');
  await expect.poll(() => name.evaluate(top)).toBe(LINE);
  await name.hover();
  await expect.poll(() => name.evaluate(top)).toBe(LINE_STRONG);
  await name.focus();
  await expect.poll(() => name.evaluate(top)).toBe(FOCUS);
});

test('the number field and its steppers firm together', async ({ mount, page }) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const hours = page.getByLabel('Hours', { exact: true });
  const decrease = page.getByRole('button', { name: /^Decrease/ });
  await expect.poll(() => decrease.evaluate(top)).toBe(LINE);
  await decrease.hover();
  await expect.poll(() => hours.evaluate(top)).toBe(LINE_STRONG);
  await expect.poll(() => decrease.evaluate(top)).toBe(LINE_STRONG);
});

test('a frame focused through its segment keeps the focus border under the pointer', async ({
  mount,
  page,
}) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const frame = page.getByRole('group', { name: 'Starts' });
  await expect.poll(() => frame.evaluate(top)).toBe(LINE);
  await frame.hover();
  await expect.poll(() => frame.evaluate(top)).toBe(LINE_STRONG);
  await frame.getByRole('spinbutton').first().focus();
  await frame.hover();
  await expect.poll(() => frame.evaluate(top)).toBe(FOCUS);
});
