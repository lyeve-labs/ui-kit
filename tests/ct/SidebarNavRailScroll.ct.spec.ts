/**
 * The icon rail in a window shorter than its entries. The consoles' nav
 * scrolls inside the sidebar, and a desktop that draws classic bars took about
 * 15px of the 55px rail for one, which put every 40px square against the
 * rail's start edge. Headless Chromium hides scroll bars unless told not to,
 * and that is a launch option, so this case has a file of its own.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import RailNavStory from './RailNavStory.svelte';
import { styleWithKit } from './kit-css.js';
import { fileURLToPath } from 'node:url';

const SOURCES = ['AppShell', 'SidebarNav', 'Logo'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);

test.use({
  viewport: { width: 1440, height: 360 },
  launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
});

test('keeps every square centered while the rail scrolls', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(RailNavStory, { props: { navClass: 'min-h-0 w-full flex-1 px-inline' } });
  await styleWithKit(page, 'light', SOURCES);
  await expect(page.getByTestId('app-rail')).toBeVisible();
  const m = await page.getByRole('navigation').evaluate((nav) => {
    const box = nav.getBoundingClientRect();
    return {
      overflowY: nav.scrollHeight - nav.clientHeight,
      overflowX: nav.scrollWidth - nav.clientWidth,
      entries: [...nav.querySelectorAll('a')].map((a) => {
        const r = a.getBoundingClientRect();
        return { left: r.left - box.left, right: box.right - r.right };
      }),
    };
  });
  expect(m.overflowY).toBeGreaterThan(0);
  expect(m.overflowX).toBe(0);
  for (const e of m.entries) expect(Math.abs(e.left - e.right)).toBeLessThanOrEqual(0.5);
});
