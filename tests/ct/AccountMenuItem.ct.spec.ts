/**
 * A browser moves focus off a control that turns disabled, so a loading
 * account menu item left a person who chose it from the keyboard on the page
 * body. A loading item stays enabled, keeps the focus and refuses the press
 * itself, and draws the way a disabled one does.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import AccountMenuItemLoadingStory from './AccountMenuItemLoadingStory.svelte';
import AccountMenuItemStatesStory from './AccountMenuItemStatesStory.svelte';
import { styleWithKit } from './kit-css.js';

test('keeps focus while loading and refuses every second press', async ({ mount, page }) => {
  await mount(AccountMenuItemLoadingStory);
  const details = page.locator('details');
  const signOut = page.getByRole('button', { name: 'Sign out' });
  const sent = page.getByTestId('sent');

  await page.locator('summary').focus();
  await page.keyboard.press('Enter');
  await signOut.focus();
  await page.keyboard.press('Enter');
  await expect(sent).toHaveText('1');

  // The first press closed the menu. Opened again, the loading item is still
  // in the tab order, so it is reached and announced as busy.
  await page.keyboard.press('Enter');
  await expect(details).toHaveJSProperty('open', true);
  await expect(signOut).toHaveAttribute('aria-busy', 'true');
  await expect(signOut).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(signOut).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await signOut.click({ force: true });
  await expect(sent).toHaveText('1');
  await expect(details).toHaveJSProperty('open', true);
  await expect(signOut).toBeFocused();
});

/*
 * A natively disabled button never matches :active, and on a touch screen
 * the held color is the only sign a press landed. A loading item stays
 * enabled, so it must not show it either. The pointer stays over the item,
 * so the color under the pointer is the baseline, and an idle item proves
 * the press shows.
 */
test('a loading item shows no held color', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(AccountMenuItemStatesStory);
  await styleWithKit(page, 'dark');
  for (const state of ['idle', 'loading'] as const) {
    const item = page.getByTestId(state).getByRole('button');
    const paint = () =>
      item.evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.backgroundColor} ${s.color}`;
      });
    const box = (await item.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);
    const over = await paint();
    await page.mouse.down();
    if (state === 'idle') {
      await expect.poll(paint, { message: 'idle' }).not.toBe(over);
    } else {
      await page.waitForTimeout(50);
      expect(await paint(), 'loading').toBe(over);
    }
    await page.mouse.up();
  }
});

/*
 * In forced colors the browser draws a natively disabled button in GrayText
 * and does nothing for aria-disabled, so a loading item kept ButtonText and
 * read as live.
 */
test('a loading item draws in GrayText in forced colors, as a disabled one does', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await mount(AccountMenuItemStatesStory);
  await styleWithKit(page, 'dark');
  const disabled = page.getByTestId('disabled').getByRole('button');
  await disabled.evaluate((el) => ((el as HTMLButtonElement).disabled = true));
  const ink = (id: string) =>
    page
      .getByTestId(id)
      .getByRole('button')
      .evaluate((el) => getComputedStyle(el).color);
  const gray = await ink('disabled');
  expect(await ink('idle'), 'idle').not.toBe(gray);
  expect(await ink('loading'), 'loading').toBe(gray);
});
