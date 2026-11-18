/**
 * The copy icon and the check of a copy control in a real browser, with the
 * kit's styles. The arriving icon fades and grows on the base rung and the
 * leaving one fades and shrinks a rung faster, both moving in place.
 */

import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import CopyGlyphStory from './CopyGlyphStory.svelte';
import { styleWithKit } from './kit-css.js';
import { settled } from './motion.js';

const SOURCE = fileURLToPath(new URL('../../src/lib/internal/CopyGlyph.svelte', import.meta.url));

/**
 * Clicks the switch and reads the transitions each icon then starts, in one
 * call, so a fast transition cannot end before the read.
 */
async function press(page: Page, button: Locator, icons: Locator[]) {
  const handles = await Promise.all([button, ...icons].map((l) => l.elementHandle()));
  return page.evaluate(async ([el, ...read]) => {
    (el as HTMLButtonElement).click();
    await new Promise<void>((done) => queueMicrotask(done));
    return read.map((icon) =>
      icon!
        .getAnimations()
        .filter((a): a is CSSTransition => a instanceof CSSTransition)
        .map((a) => `${a.transitionProperty} ${a.effect?.getTiming().duration}`)
        .sort(),
    );
  }, handles);
}

const IN = ['opacity 200', 'transform 200'];
const OUT = ['opacity 120', 'transform 120'];

test('the check grows in on the base rung as the copy icon shrinks out on the fast one', async ({
  mount,
  page,
}) => {
  await mount(CopyGlyphStory);
  await styleWithKit(page, 'dark', [SOURCE]);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const button = page.getByRole('button', { name: 'Switch' });
  const [copy, check] = [0, 1].map((i) => page.locator('[data-copy-state] > svg').nth(i));

  expect(await press(page, button, [copy, check])).toEqual([OUT, IN]);
  await settled(copy);
  await settled(check);
  expect(await check.evaluate((el) => getComputedStyle(el).transform)).toBe('none');

  expect(await press(page, button, [copy, check])).toEqual([IN, OUT]);
  await settled(copy);
  await settled(check);
  expect(await copy.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
});
