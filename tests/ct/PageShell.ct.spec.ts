/**
 * A fill page owns the height its shell gives it, so nothing inside it may
 * lengthen the shell's scroll range. A visually hidden label is absolutely
 * positioned, and in a pane that scrolls but is not positioned its containing
 * block is the shell's region: its box sat 83px below a schema editor's
 * bottom edge, the region scrolled that far under a wheel that reached the
 * pane's end, and the page's toolbar slid under the header.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import FillPageStory from './FillPageStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCE = fileURLToPath(new URL('../../src/lib/components/PageShell.svelte', import.meta.url));

test.describe('PageShell fill', () => {
  test('keeps a hidden label in a scrolling pane out of the shell region', async ({
    mount,
    page,
  }) => {
    await mount(FillPageStory);
    await styleWithKit(page, 'dark', [SOURCE]);
    const region = page.locator('#region');
    const sizes = await region.evaluate((el) => ({
      scroll: el.scrollHeight,
      client: el.clientHeight,
    }));
    expect(sizes.scroll).toBe(sizes.client);
  });

  test('lets a wheel at the end of the pane leave the shell region where it is', async ({
    mount,
    page,
  }) => {
    await mount(FillPageStory);
    await styleWithKit(page, 'dark', [SOURCE]);
    const pane = page.getByTestId('pane');
    const box = await pane.boundingBox();
    if (box === null) throw new Error('the pane has no box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 400);
    await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.locator('#region').evaluate((el) => el.scrollTop)).toBe(0);
  });
});
