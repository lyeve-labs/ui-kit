/**
 * The scroll edge fade, measured in the colors a reader sees.
 *
 * The fade is the only sign on a phone that a table or a tab strip continues
 * past its edge. A black fade has nothing to darken on a dark card, so it has
 * to be read against the surface it sits on in each theme.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import ScrollFadeStory from './ScrollFadeStory.svelte';
import { styleWithKit } from './kit-css.js';

// The fade's classes live here, and the fade is not on the page until the
// styles have laid the box out wide enough to scroll.
const EDGES = fileURLToPath(new URL('../../src/lib/internal/scroll-edges.ts', import.meta.url));

// Below this the edge is indistinguishable from the card. The fade that went
// unseen in the dark theme measured 1.06.
const MIN_CONTRAST = 1.5;

/**
 * The contrast between the fade's strongest color, painted over the first
 * opaque background under it, and that background alone. A canvas does the
 * compositing, so the answer is the pixel a reader sees.
 */
function fadeContrast(page: Page, testid: string) {
  return page.evaluate((id) => {
    const fade = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!fade) throw new Error(`no ${id}`);
    let ground = '';
    for (let el = fade.parentElement; el && !ground; el = el.parentElement) {
      const color = getComputedStyle(el).backgroundColor;
      if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') ground = color;
    }
    const image = getComputedStyle(fade).backgroundImage;
    const stop = image.match(/(?:rgba?|oklab|oklch|lab|lch|color|hsla?)\([^)]*\)/)?.[0];
    if (!ground || !stop) throw new Error(`unreadable fade: ${image} on ${ground}`);

    const ctx = document.createElement('canvas').getContext('2d')!;
    const paint = (color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };
    const bare = paint(ground);
    const faded = paint(stop);
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [luminance(bare), luminance(faded)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  }, testid);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`scroll edge fade, ${theme}`, () => {
    for (const testid of ['table-more-after', 'tabs-more-after']) {
      test(`${testid} stands out from the card`, async ({ mount, page }) => {
        await mount(ScrollFadeStory);
        await styleWithKit(page, theme, [EDGES]);
        await expect(page.getByTestId(testid)).toBeAttached();
        expect(await fadeContrast(page, testid)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      });
    }
  });
}
