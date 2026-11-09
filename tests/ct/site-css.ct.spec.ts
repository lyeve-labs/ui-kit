/**
 * dist/site.css against the build a consumer runs. The page draws every
 * component a block uses, once under the compiled stylesheet and once under
 * the kit's styles built by Tailwind for exactly the classes on the page, and
 * every element has to compute the same style both times. A class the
 * compiled file lacks shows up as a property that differs.
 */

import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import { siteStylesheet } from '../../scripts/site-css.mjs';
import SiteBlocksStory from './SiteBlocksStory.svelte';
import { styleWithKit } from './kit-css.js';

// Adding a stylesheet starts a transition on every color it changes, and a
// style read halfway through one matches neither build. A color an element
// inherits changes only once its parent's transition ends, and can start a
// transition of its own a frame later, so this waits for a frame that starts
// none. A transition that a newer one replaces rejects its promise, so each
// one is awaited as settled rather than as fulfilled.
async function settled(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const running = () =>
      document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity);
    for (await frame(); running().length > 0; await frame()) {
      await Promise.allSettled(running().map((a) => a.finished));
    }
  });
}

// Custom properties are left out. Tailwind declares a theme variable only
// where a class reads it, so the compiled file, built for every class the
// components can take, declares more of them than a page that shows a few.
// A variable that reaches the page shows up in the property that reads it.
function computed(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#root *')].map((el) => {
      const style = getComputedStyle(el);
      return {
        element: [el.tagName.toLowerCase(), ...el.classList].join('.'),
        style: Object.fromEntries(
          [...style].filter((p) => !p.startsWith('--')).map((p) => [p, style.getPropertyValue(p)]),
        ),
      };
    }),
  );
}

// The page that loads the file never runs Tailwind, so a directive left in
// it does nothing there.
test('leaves nothing for Tailwind to expand', async () => {
  const css = (await siteStylesheet()).replace(/\/\*[\s\S]*?\*\//g, '');
  expect(css).not.toMatch(
    /@(?:apply|config|custom-variant|import|plugin|reference|source|tailwind|theme|utility|variant)\b/,
  );
});

// The operating system asks for light throughout, so `system` paints the
// light palette and differs from the dark default.
for (const theme of ['dark', 'light', 'system'] as const) {
  test(`draws the block components as the Tailwind build does, ${theme}`, async ({
    mount,
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await mount(SiteBlocksStory);
    const site = await page.addStyleTag({ content: await siteStylesheet() });
    await page.evaluate((t) => {
      if (t !== 'dark') document.documentElement.dataset.theme = t;
    }, theme);
    await settled(page);
    const compiled = await computed(page);

    await site.evaluate((el) => el.remove());
    await styleWithKit(page, theme);
    await settled(page);
    const built = await computed(page);

    expect(compiled.length).toBeGreaterThan(40);
    const differences = compiled.flatMap(({ element, style }, i) =>
      Object.entries(style)
        .filter(([property, value]) => built[i].style[property] !== value)
        .map(
          ([property, value]) =>
            `${element} ${property}: ${value}, built ${built[i].style[property]}`,
        ),
    );
    expect(differences).toEqual([]);
  });
}

// A site sets one radius and its heading face on the root, after the
// stylesheet, and every component takes them. The rungs are the kit's at 8px,
// so an element drawn on one of them before the override is square after it.
test("takes a site's radius and heading face from its root", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(SiteBlocksStory);
  await page.addStyleTag({ content: await siteStylesheet() });
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#root *')].map((el) => ({
        element: [el.tagName.toLowerCase(), ...el.classList].join('.'),
        radius: getComputedStyle(el).borderTopLeftRadius,
      })),
    );
  const kit = await read();
  await page.addStyleTag({
    content: ':root { --radius-md: 0px; --font-heading: Georgia, serif; }',
  });
  const site = await read();

  const rungs = ['4px', '6px', '8px', '12px', '16px', '20px', '24px'];
  const rounded = kit.flatMap(({ element, radius }, i) =>
    rungs.includes(radius) ? [{ element, kit: radius, site: site[i].radius }] : [],
  );
  expect(rounded.length).toBeGreaterThan(5);
  expect(rounded.filter((r) => r.site !== '0px')).toEqual([]);

  // The page's heading and the card's title take the face, and the eyebrow,
  // a label rather than a title, keeps the body face.
  const faces = await page.evaluate(() =>
    Object.fromEntries(
      ['Plans', 'Pricing', 'Starter'].map((text) => {
        const heading = [...document.querySelectorAll('h2, h3')].find(
          (el) => el.textContent?.trim() === text,
        );
        return [text, heading ? getComputedStyle(heading).fontFamily.split(',')[0] : null];
      }),
    ),
  );
  expect(faces.Plans).toBe('Georgia');
  expect(faces.Pricing).not.toBe('Georgia');
  expect(faces.Starter).toBe('Georgia');
});
