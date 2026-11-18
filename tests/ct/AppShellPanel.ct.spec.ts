/**
 * The docked side panel of AppShell on its first paint. A server render draws
 * the default width and the panel shut, and the page then gives the shell the
 * reader's state: a width kept in storage, the room the window leaves, or an
 * open panel read back after mount. That is the first state, not a travel, so
 * no width moves until two frames have drawn it. A later toggle travels.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import AppShellPanelStory from './AppShellPanelStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = [
  '../../src/lib/components/AppShell.svelte',
  '../../src/lib/components/SidebarNav.svelte',
  './AppShellPanelStory.svelte',
].map((path) => fileURLToPath(new URL(path, import.meta.url)));

/** Every width transition the panel has started, finished or not. */
const widthMoves = (page: Page) =>
  page.evaluate(() => (window as unknown as { moves: number }).moves);

/** Counts each width transition the panel starts, from before the mount on. */
async function countMoves(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { moves: number }).moves = 0;
    document.addEventListener('transitionrun', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.testid === 'app-panel' && e.propertyName === 'width')
        (window as unknown as { moves: number }).moves += 1;
    });
  });
}

async function mount(
  page: Page,
  mountStory: (c: typeof AppShellPanelStory, o: object) => Promise<unknown>,
  props: object,
) {
  await countMoves(page);
  // The stylesheet is in place before the mount, as a server-rendered page has it.
  await styleWithKit(page, 'dark', SOURCES);
  await mountStory(AppShellPanelStory, { props });
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

const panelWidth = (page: Page) =>
  page.getByTestId('app-panel').evaluate((el) => el.getBoundingClientRect().width);

for (const [name, width, props, drawn] of [
  ['open from the props, in the room a 1024px window leaves', 1024, { open: true }, 320],
  ['opened after mount from a stored choice', 1280, { openAfterMount: true }, 400],
] as const) {
  test(`draws a panel ${name} with nothing moving`, async ({ mount: m, page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mount(page, m, props);
    expect(await panelWidth(page)).toBeCloseTo(drawn, 0);
    expect(await widthMoves(page)).toBe(0);
  });
}

test('travels on its width once the first state is drawn', async ({ mount: m, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mount(page, m, { open: true });
  await page.getByTestId('toggle-panel').click();
  await expect.poll(() => widthMoves(page)).toBe(1);
});
