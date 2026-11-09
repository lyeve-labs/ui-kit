/**
 * A row in the account menu moves within the app, and the layout that holds
 * the menu stays mounted, so the panel stayed open over the page the reader
 * asked for. A pick closes it and gives focus back to the trigger, with a
 * ring for the keyboard and none for a pointer.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import AccountMenuStory from './AccountMenuStory.svelte';

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
