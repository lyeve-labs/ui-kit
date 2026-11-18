/**
 * The check mark and the radio dot in a real browser, with the kit's styles.
 * Each stays in its box and fades and grows on the fast rung as it is chosen,
 * and shrinks and fades as it is cleared, rather than appearing in one frame.
 */

import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import ChoiceMarkStory from './ChoiceMarkStory.svelte';
import { styleWithKit } from './kit-css.js';
import { settled } from './motion.js';

const SOURCES = ['Checkbox.svelte', 'Radio.svelte'].map((file) =>
  fileURLToPath(new URL(`../../src/lib/components/${file}`, import.meta.url)),
);

/**
 * Clicks the input and reads the transitions each mark then starts, in one
 * call, so a fast transition cannot end before the read. Svelte redraws in a
 * microtask after the change, and the read flushes the style.
 */
async function press(page: Page, input: Locator, marks: Locator[]) {
  const handles = await Promise.all([input, ...marks].map((l) => l.elementHandle()));
  return page.evaluate(async ([el, ...read]) => {
    (el as HTMLInputElement).click();
    await new Promise<void>((done) => queueMicrotask(done));
    return read.map((mark) =>
      mark!
        .getAnimations()
        .filter((a): a is CSSTransition => a instanceof CSSTransition)
        .map((a) => `${a.transitionProperty} ${a.effect?.getTiming().duration}`)
        .sort(),
    );
  }, handles);
}

const FAST = ['opacity 120', 'transform 120'];

/**
 * Adds the kit's styles and waits out the transitions they start: the page
 * drew each hidden mark at full opacity until its classes had rules.
 */
async function styled(page: Page) {
  await styleWithKit(page, 'dark', SOURCES);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}
const opacity = (mark: Locator) => mark.evaluate((el) => getComputedStyle(el).opacity);

test('the check mark grows in and shrinks out on the fast rung', async ({ mount, page }) => {
  await mount(ChoiceMarkStory);
  await styled(page);
  const input = page.getByRole('checkbox', { name: 'Remember me' });
  const check = page.locator('input[type="checkbox"] + span path').first();
  expect(await opacity(check)).toBe('0');

  expect(await press(page, input, [check])).toEqual([FAST]);
  await settled(check);
  expect(await opacity(check)).toBe('1');

  expect(await press(page, input, [check])).toEqual([FAST]);
  await settled(check);
  expect(await opacity(check)).toBe('0');
});

test('the radio dot moves to the chosen option on the fast rung', async ({ mount, page }) => {
  await mount(ChoiceMarkStory);
  await styled(page);
  const dot = (name: string) =>
    page.getByRole('radio', { name }).locator('xpath=following-sibling::span[1]/span');
  expect(await opacity(dot('Solo'))).toBe('0');
  expect(await opacity(dot('Team'))).toBe('1');

  const solo = page.getByRole('radio', { name: 'Solo' });
  expect(await press(page, solo, [dot('Solo'), dot('Team')])).toEqual([FAST, FAST]);
  await settled(dot('Solo'));
  await settled(dot('Team'));
  expect(await opacity(dot('Solo'))).toBe('1');
  expect(await opacity(dot('Team'))).toBe('0');
});
