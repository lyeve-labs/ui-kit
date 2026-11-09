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
  await settled(page);
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

// The site's spacing step, its column width and gutter, and its second color
// are custom properties the components read, so a value set on the root
// reaches them through the compiled file. At 600 pixels three columns of 240
// do not fit and the third wraps, and at a minimum of 100 they stand in a row.
test("takes a site's spacing, columns and second color from its root", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(SiteBlocksStory);
  await page.addStyleTag({ content: await siteStylesheet() });
  const read = () =>
    page.evaluate(() => {
      const section = document.querySelector('section')!;
      const columns = [...document.querySelectorAll('div.grid')].find((el) =>
        el.textContent?.includes('Three'),
      )!;
      const quotes = [...document.querySelectorAll('figure > blockquote')].map(
        (q) => q.parentElement!,
      );
      const quote = quotes.find((q) => !q.closest('section'))!;
      const banded = quotes.find((q) => q.closest('section[data-scheme="dark"]'))!;
      return {
        padding: getComputedStyle(section).paddingTop,
        gap: getComputedStyle(columns).columnGap,
        tracks: getComputedStyle(columns)
          .gridTemplateColumns.split(' ')
          .filter((t) => t !== '0px').length,
        rule: getComputedStyle(quote).borderInlineStartColor,
        banded: getComputedStyle(banded).borderInlineStartColor,
      };
    });
  await page.setViewportSize({ width: 600, height: 800 });
  await settled(page);
  const kit = await read();
  await page.addStyleTag({
    content: `:root {
      --spacing-site-md: 2rem;
      --spacing-column-min: 100px;
      --spacing-gutter: 40px;
      --color-brand-2: rgb(255, 0, 0);
    }
    [data-scheme='dark'] {
      --color-brand-2: rgb(0, 128, 0);
    }`,
  });
  // Under reduced motion every property still transitions for a millisecond,
  // and a style read inside one returns the old value.
  await settled(page);
  const site = await read();

  expect(kit).toEqual({
    padding: '64px',
    gap: '16px',
    tracks: 2,
    rule: 'rgb(149, 135, 242)',
    banded: 'rgb(149, 135, 242)',
  });
  // Four columns of 100 would fit at 600 pixels, so three is the cap holding.
  // A band works out its second color from its own palette, so a site sets it
  // there as well.
  expect(site).toEqual({
    padding: '128px',
    gap: '40px',
    tracks: 3,
    rule: 'rgb(255, 0, 0)',
    banded: 'rgb(0, 128, 0)',
  });
});

// A band with an overlay names its scheme, and everything inside draws in that
// palette whatever the page's own: a dark band on a light page keeps the dark
// palette's text, and a light band on a dark page the light palette's.
for (const build of ['compiled', 'built'] as const) {
  test(`draws a band in its own scheme, ${build}`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(SiteBlocksStory);
    const textIn = (scheme: string) =>
      page.evaluate(
        (s) => getComputedStyle(document.querySelector(`section[data-scheme="${s}"] p`)!).color,
        scheme,
      );
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      if (build === 'compiled') await page.addStyleTag({ content: await siteStylesheet() });
      else await styleWithKit(page, theme);
      await settled(page);
      expect(await textIn('dark')).toBe('rgb(230, 232, 238)');
      expect(await textIn('light')).toBe('rgb(17, 24, 39)');
    }
  });
}

// Prose styles the bare markup it holds and leaves a kit component inside it
// alone: a Button drawn as a link keeps its label color and no underline.
test('styles bare markup in prose and leaves a kit component alone', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(SiteBlocksStory);
  await page.addStyleTag({ content: await siteStylesheet() });
  await settled(page);
  const read = await page.evaluate(() => {
    const prose = document.querySelector('h3:not([class])')!.parentElement!;
    const style = (el: Element) => getComputedStyle(el);
    const inside = [...prose.querySelectorAll('a')].find(
      (a) => a.textContent?.trim() === 'See plans',
    )!;
    const outside = [...document.querySelectorAll('a')].find(
      (a) => a.textContent?.trim() === 'Start',
    )!;
    return {
      button: [style(inside).color, style(inside).textDecorationLine],
      kit: [style(outside).color, style(outside).textDecorationLine],
      h3: style(prose.querySelector('h3')!).marginTop,
      paragraph: style(prose.querySelector('h3 + p, h2 + p')!).marginTop,
      list: style(prose.querySelector('ul')!).listStyleType,
    };
  });
  expect(read.button).toEqual(read.kit);
  expect(read.button[1]).toBe('none');
  expect(read).toMatchObject({ h3: '16px', paragraph: '8px', list: 'disc' });
});

// At 1440 pixels four columns of 240 fit, so the row of four under a cap of
// three stands three wide and the fourth wraps.
test('caps a row of columns at its max', async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mount(SiteBlocksStory);
  await page.addStyleTag({ content: await siteStylesheet() });
  await settled(page);
  const tracks = await page.evaluate(() => {
    const grid = [...document.querySelectorAll('div.grid')].find((el) =>
      el.textContent?.includes('Four'),
    )!;
    return getComputedStyle(grid)
      .gridTemplateColumns.split(' ')
      .filter((t) => t !== '0px').length;
  });
  expect(tracks).toBe(3);
});

// Every site component works at a phone's width without a script: the
// navigation wraps rather than hiding links behind a menu, and nothing makes
// the page scroll sideways. The gallery's row scrolls inside its own box,
// takes keyboard focus and has a name.
// The story's card image is 400 pixels wide by its own size, in a wider card.
test("draws a card's image across the card, whatever its own size", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mount(SiteBlocksStory);
  await page.addStyleTag({ content: await siteStylesheet() });
  await settled(page);
  const { image, card } = await page.evaluate(() => {
    const img = document.querySelector('[data-print="keep"] img')!;
    return {
      image: img.getBoundingClientRect().width,
      card: img.closest('[data-print="keep"]')!.clientWidth,
    };
  });
  expect(card).toBeGreaterThan(400);
  expect(image).toBeCloseTo(card, 0);
});

test('fits a phone without scrolling the page sideways', async ({ mount, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(SiteBlocksStory);
  await page.addStyleTag({ content: await siteStylesheet() });
  await settled(page);
  const read = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Main"]')!;
    const row = document.querySelector('ul[aria-label="Gallery"]') as HTMLElement;
    const current = nav.querySelector('[aria-current="page"]')!;
    return {
      page: document.documentElement.scrollWidth,
      nav: nav.scrollWidth <= nav.clientWidth,
      current: [current.textContent, getComputedStyle(current).textDecorationLine],
      row: [row.scrollWidth > row.clientWidth, row.tabIndex],
    };
  });
  expect(read.page).toBeLessThanOrEqual(390);
  expect(read).toMatchObject({ nav: true, current: ['Home', 'underline'], row: [true, 0] });
});
