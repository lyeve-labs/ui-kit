/**
 * The tab underline as a reader sees it move. It was drawn under each tab,
 * so a change of tab took it from one tab and put it under the next in one
 * frame. jsdom lays nothing out and runs no transition, so only a browser
 * can say where the line lands and how it gets there.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import TabsTravelStory from './TabsTravelStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = ['Tabs'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);
const MOVE = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Where the line is drawn and where the chosen tab's bottom edge is, in page pixels. */
function boxes(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector('[role="tablist"]')!;
    const bar = list.querySelector<HTMLElement>(':scope > [aria-hidden="true"] > span');
    const tab = list.querySelector<HTMLElement>('[aria-selected="true"]')!;
    const own = [...list.querySelectorAll('[role="tab"]')].filter(
      (t) => getComputedStyle(t, '::after').content !== 'none',
    ).length;
    const r = (el: Element) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, bottom: b.bottom, height: b.height };
    };
    return { bar: bar ? r(bar) : null, tab: r(tab), own };
  });
}

function expectUnder(m: Awaited<ReturnType<typeof boxes>>) {
  expect(m.bar).not.toBeNull();
  expect(Math.abs(m.bar!.left - m.tab.left)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(m.bar!.right - m.tab.right)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(m.bar!.bottom - m.tab.bottom)).toBeLessThanOrEqual(0.5);
  expect(m.bar!.height).toBeCloseTo(2, 1);
  // One line on the strip: no tab draws its own beside the moving one.
  expect(m.own).toBe(0);
}

/**
 * Collects every transition the line starts from here on, paused the moment
 * it starts, so a loaded run cannot let it end before the case reads it.
 */
function watch(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector('[role="tablist"]')!;
    const seen: { property: string; duration: number; easing: string }[] = [];
    (window as unknown as { seen: typeof seen }).seen = seen;
    list.addEventListener('transitionrun', (e) => {
      const bar = list.querySelector(':scope > [aria-hidden="true"] > span');
      if (e.target !== bar) return;
      for (const a of bar!.getAnimations()) {
        if (!(a instanceof CSSTransition)) continue;
        a.pause();
        const timing = a.effect!.getTiming();
        seen.push({
          property: a.transitionProperty,
          duration: Number(timing.duration),
          easing: String(timing.easing),
        });
      }
    });
  });
}

const seen = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { seen: { property: string; duration: number; easing: string }[] })
        .seen,
  );

const finish = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .querySelector('[role="tablist"] > [aria-hidden="true"] > span')!
        .getAnimations()
        .map((a) => (a.play(), a.finished)),
    ),
  );

for (const dir of ['ltr', 'rtl'] as const) {
  test.describe(`the tab underline, ${dir}`, () => {
    test.beforeEach(async ({ mount, page }) => {
      await mount(TabsTravelStory, { props: { dir } });
      await styleWithKit(page, 'dark', SOURCES);
      await page.evaluate(() => document.fonts.ready);
    });

    test('sits under the chosen tab from the first paint, with nothing moving', async ({
      page,
    }) => {
      expectUnder(await boxes(page));
      // The stylesheet arrives after the mount, so the tab colors ease in.
      // The line itself does not move.
      const moving = await page.evaluate(
        () =>
          document
            .querySelector('[role="tablist"]')!
            .getAnimations({ subtree: true })
            .filter((a) => a instanceof CSSTransition && a.transitionProperty === 'transform')
            .length,
      );
      expect(moving).toBe(0);
    });

    test('travels to the tab chosen next on transform, the base rung and the move curve', async ({
      page,
    }) => {
      await watch(page);
      await page.getByRole('tab', { name: 'Settings' }).click();
      await expect.poll(() => seen(page).then((s) => s.length)).toBe(1);
      expect(await seen(page)).toEqual([{ property: 'transform', duration: 200, easing: MOVE }]);
      await finish(page);
      expectUnder(await boxes(page));
    });

    test('follows the chosen tab at once when it grows', async ({ page }) => {
      await watch(page);
      const before = (await boxes(page)).tab;
      await page.getByTestId('lengthen').click();
      await expect
        .poll(async () => (await boxes(page)).tab.right - (await boxes(page)).tab.left)
        .toBeGreaterThan(before.right - before.left);
      expectUnder(await boxes(page));
      expect(await seen(page)).toEqual([]);
    });
  });
}

for (const dir of ['ltr', 'rtl'] as const) {
  test(`stays under its tab in a strip that scrolls, ${dir}`, async ({ mount, page }) => {
    await mount(TabsTravelStory, { props: { dir, width: 160 } });
    await styleWithKit(page, 'dark', SOURCES);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('tab', { name: 'Overview' }).focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const scrolled = await page.evaluate(
      () => document.querySelector('[role="tablist"]')!.scrollLeft,
    );
    expect(scrolled).not.toBe(0);
    await page.evaluate(() =>
      Promise.all(
        document
          .querySelector('[role="tablist"]')!
          .getAnimations({ subtree: true })
          .map((a) => a.finished),
      ),
    );
    expectUnder(await boxes(page));
  });
}
