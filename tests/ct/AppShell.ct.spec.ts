/**
 * The navigation rail at 768px, under a real pointer.
 *
 * The open column lies over the start of the page. It opened the moment a
 * pointer entered the rail, so a reader reaching from the navigation for a
 * toolbar button beside it crossed the rail, opened the column over the
 * button, and clicked the column. jsdom has no layout, so only a browser can
 * say which element takes the click.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import AppShellRailStory from './AppShellRailStory.svelte';
import { tabTo } from './keys.js';
import { styleWithKit } from './kit-css.js';

const SOURCES = ['AppShell', 'SidebarNav', 'Button'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);
const FRAME = 16;

test.use({ viewport: { width: 768, height: 720 } });

/** Moves the pointer one frame at a time, the way a hand does, never stopping. */
async function glide(page: Page, from: [number, number], to: [number, number], perFrame: number) {
  const frames = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / perFrame);
  for (let i = 0; i <= frames; i++) {
    const t = i / frames;
    await page.mouse.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    await page.waitForTimeout(FRAME);
  }
}

async function open(page: Page) {
  return /\bw-sidebar\b/.test((await page.getByTestId('app-sidebar').getAttribute('class')) ?? '');
}

test.describe('AppShell rail at 768px', () => {
  test.beforeEach(async ({ mount, page }) => {
    await mount(AppShellRailStory);
    await styleWithKit(page, 'dark', SOURCES);
    await expect(page.getByTestId('app-rail')).toBeVisible();
  });

  for (const [pace, perFrame] of [
    ['a quick', 12],
    ['a slow', 4],
  ] as const) {
    test(`lets ${pace} pointer cross the rail and click the button beside it`, async ({ page }) => {
      const button = page.getByRole('button', { name: 'New schema' });
      const box = (await button.boundingBox())!;
      const target: [number, number] = [box.x + box.width / 2, box.y + box.height / 2];
      expect(box.x).toBeLessThan(224);

      await glide(page, [4, target[1] + 160], target, perFrame);
      await page.mouse.down();
      await page.mouse.up();
      await expect(page.getByTestId('created')).toHaveText('1');
      expect(await open(page)).toBe(false);
    });
  }

  test('opens under a pointer that stops on it, and a label takes the click', async ({ page }) => {
    const rail = (await page.getByTestId('app-rail').boundingBox())!;
    await glide(page, [rail.x + rail.width + 80, 300], [rail.x + 28, 300], 12);
    await expect.poll(() => open(page)).toBe(true);

    const label = page.getByRole('link', { name: 'Settings' }).getByText('Settings');
    await expect(label).toBeVisible();
    await label.click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#settings');
  });

  test('opens for the keyboard at once', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Dashboard' });
    await tabTo(page, link);
    expect(await open(page)).toBe(true);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#dashboard');
  });
});
