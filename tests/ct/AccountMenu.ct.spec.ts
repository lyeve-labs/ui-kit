/**
 * A row in the account menu moves within the app, and the layout that holds
 * the menu stays mounted, so the panel stayed open over the page the reader
 * asked for. A pick closes it and gives focus back to the trigger, with a
 * ring for the keyboard and none for a pointer.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import AccountMenuInGroupStory from './AccountMenuInGroupStory.svelte';
import AccountMenuStory from './AccountMenuStory.svelte';
import { styleWithKit } from './kit-css.js';

test('closes once a row is picked and gives focus back to the trigger', async ({ mount, page }) => {
  await mount(AccountMenuStory);
  const at = () =>
    page.evaluate(() => ({
      open: document.querySelector('details')?.open,
      trigger: document.activeElement?.tagName,
      ring: document.activeElement?.matches(':focus-visible'),
    }));
  await page.locator('summary').click();
  await page.getByRole('link', { name: 'Account settings' }).click();
  expect(await at()).toEqual({ open: false, trigger: 'SUMMARY', ring: false });
  expect(await page.evaluate(() => location.hash)).toBe('#settings');

  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Sign out' }).focus();
  await page.keyboard.press('Enter');
  expect(await at()).toEqual({ open: false, trigger: 'SUMMARY', ring: true });
  await expect(page.getByTestId('sent')).toHaveText('1');
});

// Chromium hides a shut panel without dropping its style, so an entrance set
// at all times played once while the panel was hidden and at no opening.
test('plays its entrance at each opening', async ({ mount, page }) => {
  await mount(AccountMenuStory);
  await styleWithKit(page, 'dark');
  const summary = page.locator('summary');
  const panel = page.locator('details > div');
  // Running, so a finished entrance a fill mode kept would not count.
  const entrances = () =>
    panel.evaluate(
      (el) =>
        el.getAnimations().filter((a) => a instanceof CSSAnimation && a.playState === 'running')
          .length,
    );
  await summary.click();
  expect(await entrances()).toBe(1);
  await panel.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await summary.click();
  await summary.click();
  expect(await entrances()).toBe(1);
});

test('draws shut inside an open group around it, and open once opened', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(AccountMenuInGroupStory);
  await styleWithKit(page, 'dark');
  await page.mouse.move(0, 0);
  const trigger = page.getByLabel('Paid Journey, account menu');
  const look = () =>
    trigger.evaluate((el) => ({
      fill: getComputedStyle(el).backgroundColor,
      chevron: getComputedStyle(el.querySelector('svg')!).rotate,
    }));
  await expect.poll(look).toEqual({ fill: 'rgba(0, 0, 0, 0)', chevron: 'none' });
  await trigger.click();
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await look()).chevron).toBe('180deg');
  expect((await look()).fill).not.toBe('rgba(0, 0, 0, 0)');
});
