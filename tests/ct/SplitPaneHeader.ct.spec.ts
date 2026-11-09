/**
 * A pane whose own tabs name what it holds showed its name twice, an eyebrow
 * above the tabs. The tabs take the header row instead: one row with the
 * lock and the fold, as tall as the row of a pane beside it that shows its
 * label, with the active tab standing on the rule. At the width the pane
 * opens at every tab is in sight, and in a pane dragged narrower the tabs
 * scroll in their own strip behind a fade and leave the controls in place.
 */
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import SplitPaneHeaderStory from './SplitPaneHeaderStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = [
  '../../src/lib/components/SplitPane.svelte',
  '../../src/lib/components/Tabs.svelte',
  '../../src/lib/components/Button.svelte',
  '../../src/lib/components/SectionHeading.svelte',
  '../../src/lib/internal/ScrollFades.svelte',
  '../../src/lib/internal/scroll-edges.ts',
].map((p) => fileURLToPath(new URL(p, import.meta.url)));

async function readHeader(page: Page) {
  const pane = page.getByRole('complementary', { name: 'Blocks and layers' });
  await expect(pane.getByRole('heading')).toHaveCount(0);
  return page.evaluate(() => {
    const box = (el: Element | null) => el!.getBoundingClientRect();
    const aside = document.querySelector('aside[aria-label="Blocks and layers"]')!;
    const tablist = aside.querySelector('[role="tablist"]')!;
    const tabs = [...tablist.querySelectorAll('[role="tab"]')].map(box);
    const active = box(aside.querySelector('[role="tab"][aria-selected="true"]'));
    const lock = box(aside.querySelector('button[aria-label^="Lock"]'));
    const row = box(tablist.closest('.border-b'));
    const beside = document
      .querySelector('aside[aria-label="Properties"] h2')!
      .closest('.border-b');
    return {
      hidden: Math.round(tabs[tabs.length - 1].right - box(tablist).right),
      clear: Math.round(lock.left - box(tablist).right),
      onRule: Math.abs(Math.round(row.bottom - 1 - active.bottom)),
      oneRow: lock.top >= row.top && lock.bottom <= row.bottom,
      rules: [Math.round(row.bottom), Math.round(box(beside).bottom)],
      inPane: lock.right <= box(aside).right,
    };
  });
}

test('draws every tab in the header row at the width the pane opens at', async ({
  mount,
  page,
}) => {
  await mount(SplitPaneHeaderStory, { props: { width: 288 } });
  await styleWithKit(page, 'dark', SOURCES);
  const read = await readHeader(page);
  expect(read.hidden, 'every tab in sight').toBeLessThanOrEqual(0);
  expect(read.onRule, 'the active tab stands on the rule').toBeLessThanOrEqual(1);
  expect(read.oneRow, 'the lock shares the row').toBe(true);
  expect(read.rules[0], 'the rule lines up with the pane beside it').toBe(read.rules[1]);
  await expect(page.getByTestId('tabs-more-after')).toHaveCount(0);
});

test('scrolls the tabs behind a fade in a narrow pane and keeps the controls', async ({
  mount,
  page,
}) => {
  await mount(SplitPaneHeaderStory, { props: { width: 240 } });
  await styleWithKit(page, 'dark', SOURCES);
  const read = await readHeader(page);
  expect(read.hidden, 'the last tab runs past the strip').toBeGreaterThan(0);
  await expect(page.getByTestId('tabs-more-after')).toBeVisible();
  expect(read.clear, 'the tabs stop before the lock').toBeGreaterThanOrEqual(0);
  expect(read.inPane, 'the controls stay in the pane').toBe(true);
  expect(read.oneRow, 'the lock shares the row').toBe(true);
});
