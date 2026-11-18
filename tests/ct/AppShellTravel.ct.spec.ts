/**
 * The sidebar moving between the column, the rail and the shut state.
 *
 * The three were separate branches, so collapsing removed the sidebar and
 * every change of state drew the new width in one frame. jsdom lays nothing
 * out and runs no transition, so only a browser can say that the width
 * travels, on which rung and curve, and what the reader sees halfway.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import AppShellTravelStory from './AppShellTravelStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = ['AppShell', 'SidebarNav'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);
// The header's classes are written in the shared layout module, which a page
// styled before the mount has to read for them.
const BEFORE_MOUNT = ['./AppShellTravelStory.svelte', '../../src/lib/internal/layout.ts'].map(
  (path) => fileURLToPath(new URL(path, import.meta.url)),
);
const MOVE = 'cubic-bezier(0.65, 0, 0.35, 1)';

type Seen = {
  box: 'column' | 'layer' | 'aside';
  property: string;
  duration: number;
  easing: string;
};

/**
 * Collects every transition the sidebar's boxes start from here on, paused
 * the moment each starts, so a loaded run cannot let one end before the case
 * reads it.
 */
function watch(page: Page) {
  return page.evaluate(() => {
    const seen: Seen[] = [];
    (window as unknown as { seen: Seen[] }).seen = seen;
    const aside = document.querySelector<HTMLElement>('[data-testid="app-sidebar"]')!;
    const boxes = {
      aside,
      layer: aside.parentElement!,
      column: aside.parentElement!.parentElement!,
    };
    document.addEventListener('transitionrun', (e) => {
      const box = (Object.keys(boxes) as (keyof typeof boxes)[]).find((k) => boxes[k] === e.target);
      if (!box || (e as TransitionEvent).propertyName !== 'width') return;
      for (const a of boxes[box].getAnimations()) {
        if (!(a instanceof CSSTransition) || a.transitionProperty !== 'width') continue;
        a.pause();
        const timing = a.effect!.getTiming();
        seen.push({
          box,
          property: a.transitionProperty,
          duration: Number(timing.duration),
          easing: String(timing.easing),
        });
      }
    });
  });
}

const seen = (page: Page) =>
  page.evaluate(() => (window as unknown as { seen: Seen[] }).seen.map((s) => s.box).sort());

const travels = (page: Page) => page.evaluate(() => (window as unknown as { seen: Seen[] }).seen);

/** Moves every paused transition in the sidebar to a share of its length. */
const holdAt = (page: Page, share: number) =>
  page.evaluate((at) => {
    for (const a of document.getAnimations()) {
      if (a instanceof CSSTransition) a.currentTime = Number(a.effect!.getTiming().duration) * at;
    }
  }, share);

/**
 * Plays every transition to its end. The header button's hover colors are
 * among them, and the travel can move the button from under the pointer,
 * which cancels them. A canceled color is no travel, so it is not waited on.
 */
const finish = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition)
        .map((a) => (a.play(), a.finished.catch(() => undefined))),
    ),
  );

/** The widths a reader sees: the sidebar's, the box that clips it, and where the page starts. */
const widths = (page: Page) =>
  page.evaluate(() => {
    const aside = document.querySelector<HTMLElement>('[data-testid="app-sidebar"]')!;
    const w = (el: Element) => el.getBoundingClientRect().width;
    return {
      aside: w(aside),
      layer: w(aside.parentElement!),
      column: w(aside.parentElement!.parentElement!),
      main: document.querySelector('main')!.getBoundingClientRect().left,
    };
  });

async function mount(
  page: Page,
  mountStory: (c: typeof AppShellTravelStory, o: object) => Promise<unknown>,
  props = {},
) {
  await mountStory(AppShellTravelStory, { props });
  await styleWithKit(page, 'dark', SOURCES);
  // Two frames, so the shell has drawn its first state and lets widths move.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

const ALL = ['aside', 'column', 'layer'];

test.describe('the sidebar travels at 1280px', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('closes to nothing and opens again on its width, clipping what does not fit', async ({
    mount: m,
    page,
  }) => {
    await mount(page, m);
    const sidebar = page.getByTestId('app-sidebar');
    const handle = await sidebar.elementHandle();
    await watch(page);

    await page.getByRole('button', { name: 'Collapse navigation' }).click();
    await expect.poll(() => seen(page)).toEqual(['column', 'layer']);
    for (const t of await travels(page))
      expect(t).toMatchObject({ property: 'width', duration: 200, easing: MOVE });
    // Halfway, the page has taken half of the width back, and the sidebar
    // keeps its own width inside a box that cuts it off.
    await holdAt(page, 0.5);
    const half = await widths(page);
    expect(half.aside).toBeCloseTo(224, 0);
    expect(half.layer).toBeGreaterThan(20);
    expect(half.layer).toBeLessThan(204);
    expect(half.column).toBeCloseTo(half.layer, 0);
    expect(half.main).toBeCloseTo(half.column, 0);
    await finish(page);
    expect((await widths(page)).column).toBe(0);
    expect((await widths(page)).main).toBe(0);
    await expect(sidebar).toBeHidden();
    await expect(sidebar).toHaveAttribute('inert', '');
    // One sidebar throughout, never a second one mounted in its place.
    expect(await handle!.evaluate((el) => el.isConnected)).toBe(true);

    await page.evaluate(() => ((window as unknown as { seen: Seen[] }).seen.length = 0));
    await page.getByRole('button', { name: 'Expand navigation' }).click();
    await expect.poll(() => seen(page)).toEqual(['column', 'layer']);
    await finish(page);
    expect((await widths(page)).column).toBeCloseTo(224, 0);
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveAttribute('inert', '');
    expect(await handle!.evaluate((el) => el.isConnected)).toBe(true);
  });

  test('narrows to the rail a page asks for, and widens back', async ({ mount: m, page }) => {
    await mount(page, m);
    await watch(page);
    await page.getByTestId('ask-rail').click();
    await expect.poll(() => seen(page)).toEqual(ALL);
    for (const t of await travels(page))
      expect(t).toMatchObject({ property: 'width', duration: 200, easing: MOVE });
    await finish(page);
    expect((await widths(page)).column).toBeCloseTo(56, 0);
    await expect(page.getByTestId('app-rail')).toBeVisible();

    await page.evaluate(() => ((window as unknown as { seen: Seen[] }).seen.length = 0));
    await page.getByTestId('ask-rail').click();
    await expect.poll(() => seen(page)).toEqual(ALL);
    await finish(page);
    expect((await widths(page)).column).toBeCloseTo(224, 0);
  });

  test('travels to the rail as the window crosses the breakpoint, and back', async ({
    mount: m,
    page,
  }) => {
    await mount(page, m);
    await watch(page);
    await page.setViewportSize({ width: 900, height: 800 });
    await expect.poll(() => seen(page)).toEqual(ALL);
    await finish(page);
    expect((await widths(page)).column).toBeCloseTo(56, 0);

    await page.evaluate(() => ((window as unknown as { seen: Seen[] }).seen.length = 0));
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(() => seen(page)).toEqual(ALL);
    await finish(page);
    expect((await widths(page)).column).toBeCloseTo(224, 0);
  });

  test('moves the shadow of the opened rail on the fast rung and its width on the base rung', async ({
    mount: m,
    page,
  }) => {
    await mount(page, m);
    const rungs = await page.getByTestId('app-sidebar').evaluate((aside) => {
      const style = getComputedStyle(aside.parentElement!);
      const lengths = style.transitionDuration.split(', ');
      return Object.fromEntries(
        style.transitionProperty.split(', ').map((name, i) => [name, lengths[i]]),
      );
    });
    expect(rungs).toEqual({ width: '0.2s', visibility: '0.2s', 'box-shadow': '0.12s' });
  });

  test('leaves the shut sidebar out of the tab order', async ({ mount: m, page }) => {
    await mount(page, m, { collapsed: true });
    await expect(page.getByTestId('app-sidebar')).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeFocused();
  });
});

test.describe('the first paint at 900px', () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test('draws the rail it is given with nothing moving', async ({ mount: m, page }) => {
    await mount(page, m);
    expect((await widths(page)).column).toBeCloseTo(56, 0);
    // The stylesheet arrives after the mount, so colors ease in. No width moves.
    const moving = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a instanceof CSSTransition && a.transitionProperty === 'width').length,
    );
    expect(moving).toBe(0);
  });
});

/**
 * Collects every move of the header bar's row from here on, paused the moment
 * each starts, so a loaded run cannot let one end before the case reads it.
 */
function watchBar(page: Page) {
  return page.evaluate(() => {
    const rows: { duration: number; easing: string }[] = [];
    (window as unknown as { rows: typeof rows }).rows = rows;
    const row = document.querySelector('header')!.parentElement!.parentElement!;
    row.addEventListener('transitionrun', (e) => {
      if (e.target !== row || e.propertyName !== 'grid-template-rows') return;
      for (const a of row.getAnimations()) {
        if (!(a instanceof CSSTransition) || a.transitionProperty !== 'grid-template-rows')
          continue;
        a.pause();
        const timing = a.effect!.getTiming();
        rows.push({ duration: Number(timing.duration), easing: String(timing.easing) });
      }
    });
  });
}

const barMoves = (page: Page) =>
  page.evaluate(() => (window as unknown as { rows: unknown[] }).rows);

/** Where the page starts below the bar, how much of the bar shows, and what its row clips. */
const bar = (page: Page) =>
  page.evaluate(() => {
    const header = document.querySelector('header')!;
    return {
      main: document.querySelector('main')!.getBoundingClientRect().top,
      shown: header.parentElement!.getBoundingClientRect().height,
      overflow: getComputedStyle(header.parentElement!).overflow,
      inert: (header.parentElement!.parentElement as HTMLElement).inert,
    };
  });

test.describe('the header bar at 1280px', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('closes its row on the height and opens it again, with the page moving along', async ({
    mount: m,
    page,
  }) => {
    await mount(page, m);
    const header = page.locator('header');
    const handle = await header.elementHandle();
    expect(await bar(page)).toEqual({ main: 56, shown: 56, overflow: 'visible', inert: false });
    await watchBar(page);

    await page.getByTestId('ask-header').click();
    await expect.poll(() => barMoves(page)).toEqual([{ duration: 200, easing: MOVE }]);
    // Halfway, the page has moved up part of the way, under a bar cut off at
    // the row's edge.
    await holdAt(page, 0.5);
    const half = await bar(page);
    expect(half.main).toBeGreaterThan(4);
    expect(half.main).toBeLessThan(52);
    expect(half.overflow).toBe('hidden');
    await finish(page);
    expect(await bar(page)).toEqual({ main: 0, shown: 0, overflow: 'hidden', inert: true });
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeHidden();
    expect(await handle!.evaluate((el) => el.isConnected)).toBe(true);

    await page.evaluate(() => ((window as unknown as { rows: unknown[] }).rows.length = 0));
    await page.getByTestId('ask-header').click();
    await expect.poll(() => barMoves(page)).toEqual([{ duration: 200, easing: MOVE }]);
    await holdAt(page, 0.5);
    // Opening, the bar is still cut off at the row's edge, never drawn over the page.
    expect((await bar(page)).overflow).toBe('hidden');
    await finish(page);
    // At rest the row clips nothing, so a menu opened from the bar hangs below it.
    await expect
      .poll(() => bar(page))
      .toEqual({ main: 56, shown: 56, overflow: 'visible', inert: false });
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible();
    expect(await handle!.evaluate((el) => el.isConnected)).toBe(true);
  });
});

/**
 * Mounts with the kit's styles already on the page, as a server-rendered page
 * has them, and counts every travel of the header bar's row from before the
 * mount on. Styled after the mount, the first state would be drawn before any
 * transition class had a rule, and nothing could travel with or without the
 * guard.
 */
async function mountStyled(
  page: Page,
  mountStory: (c: typeof AppShellTravelStory, o: object) => Promise<unknown>,
  props = {},
) {
  await page.evaluate(() => {
    (window as unknown as { barRuns: number }).barRuns = 0;
    document.addEventListener('transitionrun', (e) => {
      const target = e.target as HTMLElement;
      if (e.propertyName === 'grid-template-rows' && target.querySelector(':scope > div > header'))
        (window as unknown as { barRuns: number }).barRuns += 1;
    });
  });
  await styleWithKit(page, 'dark', [...SOURCES, ...BEFORE_MOUNT]);
  await mountStory(AppShellTravelStory, { props: { ...props, paintFirst: true } });
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

const barRuns = (page: Page) =>
  page.evaluate(() => (window as unknown as { barRuns: number }).barRuns);

test.describe('the first paint of a header put away', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('draws the bar put away with nothing moving, and out of the tab order', async ({
    mount: m,
    page,
  }) => {
    await mountStyled(page, m, { headerHidden: true });
    expect(await bar(page)).toEqual({ main: 0, shown: 0, overflow: 'hidden', inert: true });
    expect(await barRuns(page)).toBe(0);
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeHidden();
  });

  test.describe('below md', () => {
    test.use({ viewport: { width: 600, height: 800 } });

    // The shell assumes a desktop until the browser says otherwise, so a
    // phone first draws the bar put away and then shows it. That is the first
    // state, not a travel.
    test('keeps the bar and its menu button, with nothing moving', async ({ mount: m, page }) => {
      await mountStyled(page, m, { headerHidden: true });
      expect(await bar(page)).toEqual({ main: 56, shown: 56, overflow: 'visible', inert: false });
      expect(await barRuns(page)).toBe(0);
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    });
  });
});
