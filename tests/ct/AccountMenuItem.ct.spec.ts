/**
 * A browser moves focus off a control that turns disabled, so a loading
 * account menu item left a person who chose it from the keyboard on the page
 * body. A loading item stays enabled, keeps the focus and refuses the press
 * itself, and draws the way a disabled one does.
 */
import { test, expect, type Locator } from '@playwright/experimental-ct-svelte';
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
 * On a touch screen the held color is the only sign a press landed. A loading
 * item stays enabled, so a held row keeps what it showed before the press, or
 * the press reads as accepted. An idle item proves the press shows.
 */
const paint = (item: Locator) =>
  item.evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.backgroundColor} ${s.color}`;
  });

// Reduced motion leaves a 1ms transition, so a read waits for it to end.
const settled = async (item: Locator, state: ':hover' | ':active') => {
  await expect.poll(() => item.evaluate((el, s) => el.matches(s), state)).toBe(true);
  await item.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return paint(item);
};

const center = async (item: Locator) => {
  const box = (await item.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test('a loading item shows no held color under the mouse', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(AccountMenuItemStatesStory);
  await styleWithKit(page, 'dark');
  for (const state of ['idle', 'loading'] as const) {
    const item = page.getByTestId(state).getByRole('button');
    const { x, y } = await center(item);
    await page.mouse.move(x, y);
    const over = await settled(item, ':hover');
    await page.mouse.down();
    const held = await settled(item, ':active');
    if (state === 'idle') expect(held, 'idle').not.toBe(over);
    else expect(held, 'loading').toBe(over);
    await page.mouse.up();
  }
});

/*
 * On a touch screen no hover paint applies, so a row rests transparent and
 * muted. Headless Chromium sets no :active for a synthesized touch, so the
 * press here is the mouse's on a page emulating a touch device, where
 * (hover: hover) is false as it is under a finger.
 */
test.describe('on a touch device', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('a loading item shows no held color', async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(AccountMenuItemStatesStory);
    await styleWithKit(page, 'dark');
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false);
    for (const state of ['idle', 'loading'] as const) {
      const item = page.getByTestId(state).getByRole('button');
      const rest = await paint(item);
      const { x, y } = await center(item);
      await page.mouse.move(x, y);
      await page.mouse.down();
      const held = await settled(item, ':active');
      if (state === 'idle') expect(held, 'idle').not.toBe(rest);
      else expect(held, 'loading').toBe(rest);
      await page.mouse.up();
    }
  });
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
