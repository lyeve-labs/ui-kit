/**
 * A page swap in a browser. Every motion preset plays when an ancestor removes
 * its surface, and a page is one, so the page being left stays on screen,
 * with the new page below it, until the exit of an Alert on it has played.
 * jsdom has no `Element.animate`, so every preset there plays in no time and
 * cannot show the difference.
 */

import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import PageSwapStory from './PageSwapStory.svelte';

/** Clicks Next page and counts the pages in the document at each of the next 12 frames. */
function pagesPerFrame(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const counts: number[] = [];
    document.querySelector('button')?.click();
    for (let i = 0; i < 12; i += 1) {
      await new Promise((done) => requestAnimationFrame(done));
      counts.push(document.querySelectorAll('[data-page]').length);
    }
    return counts;
  });
}

test.describe('page swap', () => {
  test('keeps the page being left while its alert leaves', async ({ mount, page }) => {
    await mount(PageSwapStory);
    const counts = await pagesPerFrame(page);
    expect(counts[0]).toBe(2);
    expect(counts.at(-1)).toBe(1);
  });

  test('replaces the page in one frame after swapPage', async ({ mount, page }) => {
    await mount(PageSwapStory, { props: { swap: true } });
    expect(await pagesPerFrame(page)).toEqual(Array(12).fill(1));
  });
});
