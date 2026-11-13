/**
 * The icon rail as a reader sees it: each entry a centered square with its
 * icon at the 20px rung, the current one filled inside the rail with the same
 * space on both sides, one even step between entries, and the mark centered
 * in a brand row as tall as the header. jsdom has no layout, so only a
 * browser can say where a box lands.
 *
 * Each case leaves a picture of the rail among its outputs, so a review can
 * look at what was measured.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import RailNavStory from './RailNavStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = ['AppShell', 'SidebarNav', 'Logo'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);
/** Bare, and with the classes every console passes its nav. */
const APPS = { bare: '', console: 'min-h-0 w-full flex-1 px-inline' };
const LABELS = [
  'Sites',
  'Pages',
  'Sections',
  'Theme',
  'Stylesheet',
  'Changes',
  'History',
  'Settings',
];

/** Where everything on the rail lands, in page pixels. */
function measure(page: Page, within = 'body') {
  return page.evaluate((root) => {
    const aside = document
      .querySelector(root)!
      .querySelector<HTMLElement>('[data-testid="app-sidebar"]')!;
    const box = aside.getBoundingClientRect();
    const edge = parseFloat(getComputedStyle(aside).borderInlineEndWidth);
    const inner = { left: box.left, right: box.right - edge };
    const header = document.querySelector('header')!.getBoundingClientRect();
    const brand = aside.querySelector<HTMLElement>('a[href="#home"]')!;
    const brandRow = brand.parentElement!.getBoundingClientRect();
    const mark = brand.querySelector('svg')!.getBoundingClientRect();
    // Every link, and every section with no link of its own. The disclosure
    // under a link that is also a section carries its own name and is left out,
    // and so is a row in a shut group, which lays out at full size and shows
    // nothing.
    const squares = 'nav a, nav button[aria-expanded]:not([aria-label])';
    const shown = [...aside.querySelectorAll<HTMLElement>(squares)].filter(
      (el) => !el.closest('[inert]'),
    );
    const entries = shown.map((a) => {
      const r = a.getBoundingClientRect();
      const icon = a.querySelector('svg')!.getBoundingClientRect();
      const bar = getComputedStyle(a, '::after');
      return {
        current: a.getAttribute('aria-current') === 'page',
        left: r.left - inner.left,
        right: inner.right - r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        icon: icon.width,
        iconOffsetX: icon.left + icon.width / 2 - (r.left + r.width / 2),
        iconOffsetY: icon.top + icon.height / 2 - (r.top + r.height / 2),
        bar: bar.content !== 'none' && parseFloat(bar.width) > 0,
      };
    });
    return {
      inner: inner.right - inner.left,
      header: { height: header.height, bottom: header.bottom },
      brandRow: { height: brandRow.height, bottom: brandRow.bottom },
      markOffset: mark.left + mark.width / 2 - (inner.left + (inner.right - inner.left) / 2),
      entries,
    };
  }, within);
}

for (const [app, navClass] of Object.entries(APPS))
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`the icon rail at 1440px, ${app} nav, ${theme}`, () => {
      // Three device pixels to a CSS pixel, so the picture shows the edges.
      test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });

      test.beforeEach(async ({ mount, page }) => {
        // The styles arrive after the mount, and a picture taken while the
        // colors ease in shows a border that is on its way to transparent.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mount(RailNavStory, { props: { navClass } });
        await styleWithKit(page, theme, SOURCES);
        await expect(page.getByTestId('app-rail')).toBeVisible();
      });

      test('draws each entry as a centered square with a 20px icon', async ({ page }, info) => {
        await page.screenshot({
          path: info.outputPath(`rail-1440-${app}-${theme}.png`),
          clip: { x: 0, y: 0, width: 200, height: 420 },
        });
        const m = await measure(page);
        await writeFile(
          info.outputPath(`rail-1440-${app}-${theme}.json`),
          JSON.stringify(m, null, 1),
        );
        expect(m.entries).toHaveLength(LABELS.length);
        for (const e of m.entries) {
          expect(e.width).toBeGreaterThanOrEqual(40);
          expect(e.height).toBeCloseTo(e.width, 0);
          expect(Math.abs(e.left - e.right)).toBeLessThanOrEqual(0.5);
          expect(e.left).toBeGreaterThan(0);
          expect(e.icon).toBe(20);
          expect(Math.abs(e.iconOffsetX)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(e.iconOffsetY)).toBeLessThanOrEqual(0.5);
        }
      });

      test('fills the current entry inside the rail with no bar beside it', async ({ page }) => {
        const current = (await measure(page)).entries.filter((e) => e.current);
        expect(current).toHaveLength(1);
        expect(current[0].bar).toBe(false);
        expect(current[0].right).toBeGreaterThan(0);
        expect(Math.abs(current[0].left - current[0].right)).toBeLessThanOrEqual(0.5);
      });

      test('keeps one step between entries', async ({ page }) => {
        const { entries } = await measure(page);
        const gaps = entries.slice(1).map((e, i) => e.top - entries[i].bottom);
        expect(new Set(gaps.map((g) => g.toFixed(1))).size).toBe(1);
      });

      test('centers the mark in a brand row as tall as the header', async ({ page }) => {
        const m = await measure(page);
        expect(m.brandRow).toEqual(m.header);
        expect(Math.abs(m.markOffset)).toBeLessThanOrEqual(0.5);
      });

      test('names every entry', async ({ page }) => {
        const nav = page.getByRole('navigation');
        for (const label of LABELS)
          await expect(nav.getByRole('link', { name: label })).toBeVisible();
      });
    });
  }

for (const [app, navClass] of Object.entries(APPS))
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`sections on the icon rail at 1440px, ${app} nav, ${theme}`, () => {
      test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });

      test('centers the icon in every square, a section with no link included', async ({
        mount,
        page,
      }, info) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mount(RailNavStory, { props: { navClass, variant: 'sections' } });
        await styleWithKit(page, theme, SOURCES);
        await expect(page.getByTestId('app-rail')).toBeVisible();
        await page.screenshot({
          path: info.outputPath(`rail-sections-1440-${app}-${theme}.png`),
          clip: { x: 0, y: 0, width: 200, height: 420 },
        });
        const m = await measure(page);
        await writeFile(
          info.outputPath(`rail-sections-1440-${app}-${theme}.json`),
          JSON.stringify(m, null, 1),
        );
        expect(m.entries).toHaveLength(6);
        for (const e of m.entries) {
          expect(e.width).toBeGreaterThanOrEqual(40);
          expect(e.height).toBeCloseTo(e.width, 0);
          expect(Math.abs(e.left - e.right)).toBeLessThanOrEqual(0.5);
          expect(e.icon).toBe(20);
          expect(Math.abs(e.iconOffsetX)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(e.iconOffsetY)).toBeLessThanOrEqual(0.5);
        }
      });
    });
  }

test.describe('the sidebar on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [app, navClass] of Object.entries(APPS))
    for (const theme of ['light', 'dark'] as const) {
      test(`keeps every row inside the open drawer, ${app} nav, ${theme}`, async ({
        mount,
        page,
      }, info) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mount(RailNavStory, { props: { navClass } });
        await styleWithKit(page, theme, SOURCES);
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.waitForFunction(() =>
          document.getAnimations().every((a) => a.playState !== 'running'),
        );
        await page.screenshot({ path: info.outputPath(`drawer-390-${app}-${theme}.png`) });
        const m = await measure(page, '[role="dialog"]');
        for (const e of m.entries) {
          expect(e.left).toBeGreaterThanOrEqual(0);
          expect(e.right).toBeGreaterThanOrEqual(0);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          390,
        );
      });
    }
});
