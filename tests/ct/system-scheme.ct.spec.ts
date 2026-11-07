/**
 * A page that names data-theme="system" runs no script, so a media query is
 * all that resolves it. Each case sets the operating system's answer in a real
 * browser and reads what the page paints.
 */

import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import Logo from '../../src/lib/components/Logo.svelte';
import { styleWithKit } from './kit-css.js';

const INK = { dark: 'rgb(11, 20, 34)', light: 'rgb(246, 247, 249)' };

function token(page: Page, name: string) {
  return page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
}

test.describe('data-theme="system"', () => {
  test('paints what the operating system asks for, and repaints when it changes', async ({
    mount,
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await mount(Logo);
    await styleWithKit(page, 'system');
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', INK.light);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'light dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(body).toHaveCSS('background-color', INK.dark);
  });

  // The copy of the light palette outranks the forced-colors rule on :root,
  // so that rule names the system page as it names the light one.
  test('gives way to forced colors under a light system', async ({ mount, page }) => {
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
    await mount(Logo);
    await styleWithKit(page, 'system');
    expect(await token(page, '--color-glow')).toBe('transparent');
    expect(await token(page, '--color-mark-ink')).toBe('CanvasText');
  });

  test('prints black on white under a light system', async ({ mount, page }) => {
    await page.emulateMedia({ colorScheme: 'light', media: 'print' });
    await mount(Logo);
    await styleWithKit(page, 'system');
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(body).toHaveCSS('color', 'rgb(0, 0, 0)');
  });
});
