/**
 * A nested row in a real browser, where its box, its bar and its border have a
 * position jsdom cannot give them.
 *
 * The current page's bar sat in its section's column, outside the indented
 * label it marked, while the section drew a curved rail of its own and the
 * current row alone carried an edge. A nested row now draws the way a
 * top-level row does, and only the current page carries a mark.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import SidebarNavNestedStory from './SidebarNavNestedStory.svelte';
import { styleWithKit as addKit } from './kit-css.js';

const SOURCES = [
  fileURLToPath(new URL('../../src/lib/components/SidebarNav.svelte', import.meta.url)),
];

/** Styles the page and lets every color transition the new rules start settle. */
async function styleWithKit(page: Page, theme: 'dark' | 'light', sources: string[]) {
  await addKit(page, theme, sources);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

test.use({ viewport: { width: 320, height: 260 } });

/** The row's box, and where its ::after bar starts inside it. */
async function geometry(row: Locator) {
  return row.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const bar = getComputedStyle(el, '::after');
    return {
      left: box.left,
      barLeft: box.left + parseFloat(bar.insetInlineStart || bar.left),
      borderStart: getComputedStyle(el).borderInlineStartColor,
      shadow: getComputedStyle(el).boxShadow,
    };
  });
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`a nested current page, ${theme}`, () => {
    test('starts its box and its bar at its own indent', async ({ mount, page }) => {
      const nav = await mount(SidebarNavNestedStory, {
        props: { activePath: '/customers/deletions' },
      });
      await styleWithKit(page, theme, SOURCES);
      await nav.getByRole('link', { name: 'QA accounts' }).hover();
      await nav.screenshot({ path: test.info().outputPath(`nested-${theme}.png`) });
      const parent = await geometry(nav.getByRole('link', { name: 'Customers' }));
      const current = await geometry(nav.getByRole('link', { name: 'Deletion requests' }));
      expect(current.left).toBeGreaterThan(parent.left);
      expect(current.barLeft).toBeGreaterThanOrEqual(current.left - 2);
    });

    test('draws no rail on the section and no edge on the current row', async ({ mount, page }) => {
      const nav = await mount(SidebarNavNestedStory, {
        props: { activePath: '/customers/deletions' },
      });
      await styleWithKit(page, theme, SOURCES);
      const parent = await geometry(nav.getByRole('link', { name: 'Customers' }));
      const current = await geometry(nav.getByRole('link', { name: 'Deletion requests' }));
      const rest = await geometry(nav.getByRole('link', { name: 'Checkouts' }));
      for (const row of [parent, current, rest]) expect(row.borderStart).toBe('rgba(0, 0, 0, 0)');
      expect(current.shadow).toBe(rest.shadow);
    });

    test('draws a top-level current page the same way', async ({ mount, page }) => {
      const nav = await mount(SidebarNavNestedStory, { props: { activePath: '/' } });
      await styleWithKit(page, theme, SOURCES);
      await nav.screenshot({ path: test.info().outputPath(`top-${theme}.png`) });
    });

    test('marks a nested current page on the collapsed rail', async ({ mount, page }) => {
      const nav = await mount(SidebarNavNestedStory, {
        props: { activePath: '/customers/deletions', collapsed: true },
      });
      await styleWithKit(page, theme, SOURCES);
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await nav.screenshot({ path: test.info().outputPath(`rail-${theme}.png`) });
    });
  });
}
