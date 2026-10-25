/**
 * SortableList in a real browser: a mouse drag with capture, a drop the
 * check refuses, Escape, the keys on a handle and inside a text field, a
 * finger that rests, a finger that swipes and a second finger, the scroll at
 * the list's edge and the time a keyboard move takes in a list of 500 rows.
 */

import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { TOUCH_HOLD_MS } from '../../src/lib/internal/reorder.js';
import SortableListStory from './SortableListStory.svelte';
import { tabTo } from './keys.js';

async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target has no box');
  return box;
}

/** A height inside a row: 0.25 is in its upper half, 0.75 in its lower. */
async function within(story: Locator, row: number, share: number) {
  const box = await boxOf(story.locator('li').nth(row));
  return box.y + box.height * share;
}

async function handleAt(story: Locator, name: string) {
  const box = await boxOf(story.getByRole('button', { name: `Move ${name}` }));
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses a handle with the mouse and moves past the slop, so the row lifts. */
async function liftWithMouse(page: Page, story: Locator, name: string) {
  const { x, y } = await handleAt(story, name);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 8, { steps: 2 });
  return x;
}

/** Fingers on the page, through the browser's own touch input. */
async function fingers(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  return (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number }[] = []) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((p, id) => ({ ...p, id })),
    });
}

const ORDER = 'Hero, Features, Pricing, Quotes, Footer';
const lifted = /translate/;

test.describe('SortableList by pointer', () => {
  test('drops a lifted row where the line marks', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: {} });
    const x = await liftWithMouse(page, story, 'Hero');
    await page.mouse.move(x, await within(story, 3, 0.75), { steps: 6 });
    await expect(story.locator('li').nth(3)).toHaveClass(/after:bg-brand/);
    await page.mouse.up();
    await expect(story.getByTestId('order')).toHaveText('Features, Pricing, Quotes, Hero, Footer');
    await expect(story.getByRole('status')).toHaveText('Hero moved to position 4 of 5.');
    await expect(story.getByTestId('moves')).toHaveText('Hero 0 to 3');
  });

  test("marks a place the check refuses, and says the check's sentence on the drop", async ({
    mount,
    page,
  }) => {
    const story = await mount(SortableListStory, { props: { refuseFooter: true } });
    const x = await liftWithMouse(page, story, 'Footer');
    await page.mouse.move(x, await within(story, 0, 0.25), { steps: 6 });
    await expect(story.locator('li').first()).toHaveClass(/before:bg-danger/);
    await expect(story.getByRole('button', { name: 'Move Footer' })).toHaveClass(
      /cursor-not-allowed/,
    );
    await page.mouse.up();
    await expect(story.getByTestId('order')).toHaveText(ORDER);
    await expect(story.getByRole('status')).toHaveText('The footer stays last.');
    await expect(story.getByTestId('moves')).toHaveText('');
  });

  test('puts a lifted row back on Escape and moves nothing on the release', async ({
    mount,
    page,
  }) => {
    const story = await mount(SortableListStory, { props: {} });
    const x = await liftWithMouse(page, story, 'Hero');
    await page.mouse.move(x, await within(story, 4, 0.75), { steps: 6 });
    const hero = story.locator('li').first();
    await expect(hero).toHaveAttribute('style', lifted);
    await page.keyboard.press('Escape');
    await expect(hero).not.toHaveAttribute('style', lifted);
    await page.mouse.up();
    await expect(story.getByTestId('order')).toHaveText(ORDER);
    await expect(story.getByTestId('moves')).toHaveText('');
  });

  test('scrolls the box around the list while a lifted row is held at its edge', async ({
    mount,
    page,
  }) => {
    const story = await mount(SortableListStory, { props: { count: 20, frame: 200 } });
    const frame = story.getByTestId('frame');
    const box = await boxOf(frame);
    // The rows in sight before the scroll: without it, no drop lands past them.
    const seen = await frame.evaluate(
      (el) =>
        [...el.querySelectorAll('li')].filter(
          (li) => li.getBoundingClientRect().top < el.getBoundingClientRect().bottom,
        ).length,
    );
    const x = await liftWithMouse(page, story, 'Hero');
    await page.mouse.move(x, box.y + box.height - 8, { steps: 6 });
    await expect.poll(() => frame.evaluate((el) => el.scrollTop)).toBeGreaterThan(200);
    await page.mouse.up();
    const to = Number(
      (await story.getByTestId('moves').textContent())?.match(/^Hero 0 to (\d+)$/)?.[1],
    );
    expect(to).toBeGreaterThanOrEqual(seen);
  });
});

test.describe('SortableList by keys', () => {
  test('moves the row of the focused handle and keeps the focus on it', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: {} });
    const handle = story.getByRole('button', { name: 'Move Pricing' });
    await tabTo(page, handle);
    await page.keyboard.press('Alt+ArrowUp');
    await expect(story.getByTestId('order')).toHaveText('Hero, Pricing, Features, Quotes, Footer');
    await expect(story.getByRole('status')).toHaveText('Pricing moved to position 2 of 5.');
    await expect(handle).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    await page.keyboard.press('Alt+ArrowDown');
    await expect(story.getByTestId('order')).toHaveText('Hero, Features, Quotes, Pricing, Footer');
    await expect(handle).toBeFocused();
  });

  test('says when a row is already at an end', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: {} });
    await tabTo(page, story.getByRole('button', { name: 'Move Hero' }));
    await page.keyboard.press('Alt+ArrowUp');
    await expect(story.getByRole('status')).toHaveText('Hero is already first.');
    await tabTo(page, story.getByRole('button', { name: 'Move Footer' }));
    await page.keyboard.press('Alt+ArrowDown');
    await expect(story.getByRole('status')).toHaveText('Footer is already last.');
    await expect(story.getByTestId('order')).toHaveText(ORDER);
  });

  test('leaves Alt and an arrow to a text field inside a row', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: { fields: true } });
    const field = story.getByLabel('Pricing title');
    await tabTo(page, field);
    await page.keyboard.press('Alt+ArrowUp');
    await expect(story.getByTestId('order')).toHaveText(ORDER);
    await expect(field).toBeFocused();
  });

  test('moves a row of 500 within 50 ms at the 95th percentile', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: { count: 500 } });
    await story.getByRole('button', { name: 'Move Hero' }).focus();
    // Each move is timed from the key to the live region's new sentence,
    // which Svelte writes after the rows have moved.
    const times = await page.evaluate(async () => {
      const status = document.querySelector('[role="status"]')!;
      const out: number[] = [];
      for (let i = 0; i < 50; i++) {
        const before = status.textContent;
        const said = new Promise<void>((resolve) => {
          const watch = new MutationObserver(() => {
            if (status.textContent === before) return;
            watch.disconnect();
            resolve();
          });
          watch.observe(status, { childList: true, subtree: true, characterData: true });
        });
        const start = performance.now();
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
        );
        await said;
        out.push(performance.now() - start);
        // The handle takes the focus back after the move, before the next key.
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return out;
    });
    const sorted = times.slice().sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    test.info().annotations.push({
      type: 'move-ms',
      description: `p50 ${sorted[24].toFixed(1)}, p95 ${p95.toFixed(1)}, max ${sorted[49].toFixed(1)}`,
    });
    await expect(story.getByRole('status')).toHaveText('Hero moved to position 51 of 500.');
    // Alt and an arrow move the row and never reach the handle's menu.
    await expect(story.getByRole('menu')).toHaveCount(0);
    expect(p95).toBeLessThanOrEqual(50);
  });
});

test.describe('SortableList by touch', () => {
  test.use({ hasTouch: true });

  test('lifts a row once a finger rests on its handle, and moves it with the finger', async ({
    mount,
    page,
  }) => {
    await page.clock.install();
    const story = await mount(SortableListStory, { props: {} });
    const touch = await fingers(page);
    const { x, y } = await handleAt(story, 'Hero');
    const target = await within(story, 3, 0.75);
    const hero = story.locator('li').first();
    await touch('touchStart', [{ x, y }]);
    await page.clock.runFor(TOUCH_HOLD_MS - 50);
    await expect(hero).not.toHaveAttribute('style', lifted);
    await page.clock.runFor(50);
    await expect(hero).toHaveAttribute('style', lifted);
    await touch('touchMove', [{ x, y: target }]);
    await touch('touchEnd');
    await expect(story.getByTestId('order')).toHaveText('Features, Pricing, Quotes, Hero, Footer');
    await expect(story.getByRole('menu')).toHaveCount(0);
  });

  test('lifts nothing when the finger travels before the hold is up', async ({ mount, page }) => {
    await page.clock.install();
    const story = await mount(SortableListStory, { props: {} });
    const touch = await fingers(page);
    const { x, y } = await handleAt(story, 'Hero');
    await touch('touchStart', [{ x, y }]);
    await touch('touchMove', [{ x, y: y + 30 }]);
    await page.clock.runFor(TOUCH_HOLD_MS * 4);
    await expect(story.locator('li').first()).not.toHaveAttribute('style', lifted);
    await touch('touchEnd');
    await expect(story.getByTestId('order')).toHaveText(ORDER);
  });

  test('puts a lifted row back when a second finger lands', async ({ mount, page }) => {
    await page.clock.install();
    const story = await mount(SortableListStory, { props: {} });
    const touch = await fingers(page);
    const { x, y } = await handleAt(story, 'Hero');
    const low = await within(story, 4, 0.75);
    const hero = story.locator('li').first();
    await touch('touchStart', [{ x, y }]);
    await page.clock.runFor(TOUCH_HOLD_MS);
    await touch('touchMove', [{ x, y: low }]);
    await expect(hero).toHaveAttribute('style', lifted);
    await touch('touchStart', [
      { x, y: low },
      { x: x + 200, y },
    ]);
    await expect(hero).not.toHaveAttribute('style', lifted);
    await touch('touchEnd');
    await expect(story.getByTestId('order')).toHaveText(ORDER);
  });

  test("opens the handle's menu on a tap", async ({ mount }) => {
    const story = await mount(SortableListStory, { props: {} });
    await story.getByRole('button', { name: 'Move Hero' }).tap();
    await story.getByRole('menuitem', { name: 'Move down' }).tap();
    await expect(story.getByTestId('order')).toHaveText('Features, Hero, Pricing, Quotes, Footer');
  });
});

test.describe("SortableList's handle menu", () => {
  test('opens on a click, moves the row and keeps the focus on the handle', async ({ mount }) => {
    const story = await mount(SortableListStory, { props: {} });
    const handle = story.getByRole('button', { name: 'Move Hero' });
    await handle.click();
    await expect(story.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    await story.getByRole('menuitem', { name: 'Move down' }).click();
    await expect(story.getByTestId('order')).toHaveText('Features, Hero, Pricing, Quotes, Footer');
    await expect(story.getByRole('status')).toHaveText('Hero moved to position 2 of 5.');
    await expect(handle).toBeFocused();
  });

  test('opens from the keyboard with Enter', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: {} });
    const handle = story.getByRole('button', { name: 'Move Pricing' });
    await tabTo(page, handle);
    await page.keyboard.press('Enter');
    await expect(story.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(story.getByTestId('order')).toHaveText('Hero, Features, Quotes, Pricing, Footer');
    await expect(handle).toBeFocused();
  });

  test('stays shut after a drag ends on the handle, and opens on the next click or Enter', async ({
    mount,
    page,
  }) => {
    const story = await mount(SortableListStory, { props: {} });
    const handle = story.getByRole('button', { name: 'Move Hero' });
    const { y } = await handleAt(story, 'Hero');
    const x = await liftWithMouse(page, story, 'Hero');
    // Back over its own handle, so the release lands there and leaves a click.
    await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
    await expect(story.getByTestId('order')).toHaveText(ORDER);
    await expect(story.getByRole('menu')).toHaveCount(0);
    await handle.focus();
    await page.keyboard.press('Enter');
    await expect(story.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await handle.click();
    await expect(story.getByRole('menu')).toBeVisible();
  });
});

test.describe('SortableList when the caller changes the rows mid-drag', () => {
  const settled = (page: Page) => page.waitForFunction(() => document.getAnimations().length === 0);

  test('still moves the lifted row after a row lands above it', async ({ mount, page }) => {
    const story = await mount(SortableListStory, { props: {} });
    const x = await liftWithMouse(page, story, 'Pricing');
    await story.getByRole('button', { name: 'Add a row at the top' }).dispatchEvent('click');
    await expect(story.getByTestId('order')).toHaveText(
      'New, Hero, Features, Pricing, Quotes, Footer',
    );
    await settled(page);
    // Quotes is the fifth row now, and below its middle Pricing lands after it.
    await page.mouse.move(x, await within(story, 4, 0.75), { steps: 4 });
    await page.mouse.up();
    await expect(story.getByTestId('order')).toHaveText(
      'New, Hero, Features, Quotes, Pricing, Footer',
    );
    await expect(story.getByTestId('moves')).toHaveText('Pricing 3 to 4');
    await expect(story.getByRole('status')).toHaveText('Pricing moved to position 5 of 6.');
  });

  test('ends the drag when the lifted row is removed, and the keys work after', async ({
    mount,
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const story = await mount(SortableListStory, { props: {} });
    const x = await liftWithMouse(page, story, 'Pricing');
    await page.mouse.move(x, await within(story, 4, 0.75), { steps: 4 });
    await story.getByRole('button', { name: 'Delete Pricing' }).dispatchEvent('click');
    await expect(story.getByTestId('order')).toHaveText('Hero, Features, Quotes, Footer');
    await page.mouse.up();
    await page.keyboard.press('Escape');
    await story.getByRole('button', { name: 'Move Hero' }).focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(story.getByTestId('order')).toHaveText('Features, Hero, Quotes, Footer');
    await expect(story.getByTestId('moves')).toHaveText('Hero 0 to 1');
    expect(errors).toEqual([]);
  });
});
