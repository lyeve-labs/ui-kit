/**
 * The page a visitor gets: every component a block draws with, rendered on
 * the server, styled by the compiled stylesheet and carrying no script. The
 * HTML is the server's own, kept in a file by site-components.ssr.test.ts.
 * Each picture arrives from the network, held back when a case asks, so a
 * box the page fails to reserve changes size once the picture lands.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Browser, type Page } from '@playwright/experimental-ct-svelte';
import { readFile } from 'node:fs/promises';
import { siteStylesheet } from '../../scripts/site-css.mjs';

const ORIGIN = 'http://site.test';
const PICTURE =
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='#808080'/></svg>";

type Theme = 'dark' | 'light' | 'system';

async function visit(
  browser: Browser,
  { theme = 'dark', scheme = 'light', width = 1440, script = true, arrive = undefined } = {} as {
    theme?: Theme;
    scheme?: 'light' | 'dark';
    width?: number;
    script?: boolean;
    /** Every picture's response waits for it. */
    arrive?: Promise<unknown>;
  },
): Promise<Page> {
  const body = (
    await readFile(new URL('../fixtures/site-page-ssr.html', import.meta.url), 'utf8')
  ).replaceAll(/src="data:image\/svg\+xml[^"]*"/g, `src="${ORIGIN}/picture.svg"`);
  const html = `<!doctype html><html lang="en"${theme === 'dark' ? '' : ` data-theme="${theme}"`}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>A site</title><link rel="stylesheet" href="/site.css"></head><body><main>${body}</main></body></html>`;
  const css = await siteStylesheet();
  const context = await browser.newContext({
    javaScriptEnabled: script,
    colorScheme: scheme,
    reducedMotion: 'reduce',
    viewport: { width, height: 900 },
  });
  const tab = await context.newPage();
  await tab.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (path === '/site.css') return route.fulfill({ contentType: 'text/css', body: css });
    if (path === '/picture.svg') {
      await arrive;
      return route.fulfill({ contentType: 'image/svg+xml', body: PICTURE });
    }
    return route.abort();
  });
  // A held picture holds the load event, so such a page is ready once its
  // stylesheet is in.
  await tab.goto(`${ORIGIN}/`, { waitUntil: arrive ? 'domcontentloaded' : 'load' });
  if (arrive) await tab.waitForFunction(() => document.styleSheets[0]?.cssRules.length > 0);
  return tab;
}

test('carries no script, and an accordion opens with script turned off', async ({ browser }) => {
  const tab = await visit(browser, { script: false });
  await expect(tab.locator('script')).toHaveCount(0);
  const handlers = await tab
    .locator('*')
    .evaluateAll((all) =>
      all.flatMap((el) => [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => a.name)),
    );
  expect(handlers).toEqual([]);
  const item = tab.locator('details#included');
  await tab.getByText('What is included?').click();
  await expect(item).toHaveAttribute('open', '');
  await expect(tab.getByText('Every block.')).toBeVisible();
  await tab.context().close();
});

for (const [theme, scheme] of [
  ['dark', 'light'],
  ['light', 'dark'],
  ['system', 'light'],
  ['system', 'dark'],
] as const) {
  test(`clears AA in the ${theme} theme, the system asking for ${scheme}`, async ({ browser }) => {
    const tab = await visit(browser, { theme, scheme });
    // Every item open, so the text inside is measured too.
    await tab
      .locator('details')
      .evaluateAll((all) => all.forEach((d) => d.setAttribute('open', '')));
    const { violations, incomplete } = await new AxeBuilder({ page: tab })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual(
      [],
    );
    // Axe cannot measure text over a picture or a gradient. Text over a
    // picture sits in a section with an overlay, and text over a gradient sits
    // in a card's light or on a button's lift. contrast.test.ts works out the
    // overlay and every stop of both gradients, so only text axe could not
    // measure anywhere else fails here.
    const unmeasured: string[] = [];
    for (const check of incomplete) {
      for (const node of check.nodes) {
        const reason = String(node.any.map((c) => c.data?.messageKey).find(Boolean));
        const covered = await tab.evaluate(
          ([selector, why]) => {
            const el = document.querySelector(selector);
            if (why === 'imgNode') {
              // A section names its scheme only when an overlay covers its picture.
              const band = el?.closest('section[data-scheme]');
              return !!band?.querySelector(':scope > img + [aria-hidden="true"]');
            }
            if (why === 'bgGradient') return !!el?.closest('.bg-card, .bg-lift');
            return false;
          },
          [String(node.target[0]), reason],
        );
        if (!covered) unmeasured.push(`${check.id}: ${node.target} (${reason})`);
      }
    }
    expect(unmeasured).toEqual([]);
    await tab.context().close();
  });
}

for (const width of [1440, 390]) {
  test(`keeps every box still while the pictures arrive, ${width} pixels wide`, async ({
    browser,
  }) => {
    let release = () => {};
    const arrive = new Promise<void>((resolve) => (release = resolve));
    const tab = await visit(browser, { width, arrive });
    // Down the page half a screen at a time, so each lazy picture is asked for.
    const scrollThrough = () =>
      tab.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
          scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        scrollTo(0, 0);
      });
    // Where each picture sits on the page and how large it is, and the page's height.
    const boxes = () =>
      tab.evaluate(() => ({
        page: document.querySelector('main')!.scrollHeight,
        pictures: [...document.images].map((img) => {
          const box = img.getBoundingClientRect();
          return [box.top + scrollY, box.left, box.width, box.height].map(Math.round);
        }),
      }));
    await scrollThrough();
    const loaded = () => tab.evaluate(() => [...document.images].filter((i) => i.complete).length);
    expect(await loaded()).toBe(0);
    const held = await boxes();
    release();
    await scrollThrough();
    await tab.waitForFunction(() => [...document.images].every((img) => img.complete));
    expect(await boxes()).toEqual(held);
    const shift = await tab.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(total), 300);
        }),
    );
    expect(shift).toBeLessThan(0.1);
    const sideways = await tab.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sideways).toBe(0);
    await tab.context().close();
  });
}
