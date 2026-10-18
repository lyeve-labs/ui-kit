/**
 * SplitPane in a real browser: the pointer drag with capture, the keys on a
 * focused separator, the lock and the fold, and a right-to-left page, where
 * the computed direction decides which way the edge moves.
 */

import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import SplitPaneStory from './SplitPaneStory.svelte';
import { tabTo } from './keys.js';
import { styleWithKit } from './kit-css.js';

const SOURCE = fileURLToPath(new URL('../../src/lib/components/SplitPane.svelte', import.meta.url));

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('ct-pane') ?? 'null'));

async function dragBy(page: Page, handle: Locator, dx: number) {
  const box = await handle.boundingBox();
  if (!box) throw new Error('the handle has no box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y);
  await page.mouse.move(x + dx, y);
  return { release: () => page.mouse.up() };
}

test.describe('SplitPane', () => {
  test('drags the inner edge and writes the width once, on release', async ({ mount, page }) => {
    const pane = await mount(SplitPaneStory, { props: {} });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    await expect(handle).toHaveAttribute('aria-valuenow', '260');

    const drag = await dragBy(page, handle, 60);
    await expect(handle).toHaveAttribute('aria-valuenow', '320');
    expect(await stored(page)).toBeNull();
    await drag.release();
    expect(await stored(page)).toEqual({ width: 320, locked: false });
  });

  test('grows an end pane when the pointer moves toward the start', async ({ mount, page }) => {
    const pane = await mount(SplitPaneStory, { props: { side: 'end' } });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    const drag = await dragBy(page, handle, -60);
    await drag.release();
    await expect(handle).toHaveAttribute('aria-valuenow', '320');
  });

  test('moves by a step on the arrows, more with Shift, and to the bounds on Home and End', async ({
    mount,
    page,
  }) => {
    const pane = await mount(SplitPaneStory, { props: {} });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '284');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '204');
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', '500');
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '200');
    expect(await stored(page)).toEqual({ width: 200, locked: false });
  });

  test('keeps the main column the pane minimum when a stored width no longer fits', async ({
    mount,
    page,
  }) => {
    const pane = await mount(SplitPaneStory, {
      props: { frame: 600, seed: { width: 480, locked: false } },
    });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    // Drawn at the room left, and the stored width is left alone until the edge moves.
    expect(Math.round((await pane.locator('aside').boundingBox())!.width)).toBe(400);
    expect(await stored(page)).toEqual({ width: 480, locked: false });
    // The handle announces the width drawn and the most the room allows.
    await expect(handle).toHaveAttribute('aria-valuenow', '400');
    await expect(handle).toHaveAttribute('aria-valuemax', '400');
    await handle.focus();
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', '400');
    expect(await stored(page)).toEqual({ width: 400, locked: false });
  });

  test('locks the width, which takes the handle away and is remembered', async ({
    mount,
    page,
  }) => {
    const pane = await mount(SplitPaneStory, { props: {} });
    await pane.getByRole('button', { name: 'Lock Layers width' }).click();
    await expect(pane.getByRole('separator')).toHaveCount(0);
    await expect(pane.getByRole('button', { name: 'Unlock Layers width' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await stored(page)).toEqual({ width: 260, locked: true });
    await pane.getByRole('button', { name: 'Unlock Layers width' }).click();
    await expect(pane.getByRole('separator', { name: 'Resize Layers' })).toBeVisible();
  });

  test('folds to a strip and opens again from it', async ({ mount }) => {
    const pane = await mount(SplitPaneStory, { props: { collapsible: true } });
    const aside = pane.locator('aside');
    await pane.getByRole('button', { name: 'Collapse Layers' }).click();
    await expect(aside).toHaveAttribute('data-open', 'false');
    await pane.getByRole('button', { name: 'Expand Layers' }).click();
    await expect(aside).toHaveAttribute('data-open', 'true');
  });

  test('locks on Enter and unlocks on Space from the keyboard', async ({ mount, page }) => {
    const pane = await mount(SplitPaneStory, { props: {} });
    const lock = pane.getByRole('button', { name: 'Lock Layers width' });
    await tabTo(page, lock);
    await page.keyboard.press('Enter');
    await expect(pane.getByRole('separator')).toHaveCount(0);
    const unlock = pane.getByRole('button', { name: 'Unlock Layers width' });
    await expect(unlock).toBeFocused();
    expect(await stored(page)).toEqual({ width: 260, locked: true });
    await page.keyboard.press('Space');
    await expect(pane.getByRole('separator', { name: 'Resize Layers' })).toBeVisible();
    expect(await stored(page)).toEqual({ width: 260, locked: false });
  });
});

// With the kit's styles the control pressed is hidden by the fold it causes,
// which unstyled markup never shows: a pane that leaves focus there strands a
// keyboard reader on the body or on a control nobody can see.
test.describe('SplitPane with the kit styles', () => {
  async function holdsFocus(control: Locator) {
    await expect(control).toBeFocused();
    expect(await control.evaluate((el) => el.checkVisibility())).toBe(true);
  }

  test('hands focus to the control that undoes a fold made from the keyboard', async ({
    mount,
    page,
  }) => {
    const pane = await mount(SplitPaneStory, { props: { collapsible: true } });
    await styleWithKit(page, 'dark', [SOURCE]);
    const aside = pane.locator('aside');
    const collapse = pane.getByRole('button', { name: 'Collapse Layers' });
    const expand = pane.getByRole('button', { name: 'Expand Layers' });

    await tabTo(page, collapse);
    await page.keyboard.press('Space');
    await expect(aside).toHaveAttribute('data-open', 'false');
    await holdsFocus(expand);
    await page.keyboard.press('Enter');
    await expect(aside).toHaveAttribute('data-open', 'true');
    await holdsFocus(collapse);
    await page.keyboard.press('Enter');
    await expect(aside).toHaveAttribute('data-open', 'false');
    await holdsFocus(expand);
    await page.keyboard.press('Space');
    await expect(aside).toHaveAttribute('data-open', 'true');
    await holdsFocus(collapse);
  });

  test('hands focus to the control that undoes a fold made by a click', async ({ mount, page }) => {
    const pane = await mount(SplitPaneStory, { props: { collapsible: true } });
    await styleWithKit(page, 'dark', [SOURCE]);
    const collapse = pane.getByRole('button', { name: 'Collapse Layers' });
    const expand = pane.getByRole('button', { name: 'Expand Layers' });

    await collapse.click();
    await holdsFocus(expand);
    await expand.click();
    await holdsFocus(collapse);
  });
});

test.describe('SplitPane in a right-to-left page', () => {
  test('narrows a start pane on ArrowRight, because its edge is on the left', async ({
    mount,
    page,
  }) => {
    const pane = await mount(SplitPaneStory, { props: { dir: 'rtl' } });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '236');
    await page.keyboard.press('ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '260');
  });

  test('widens a start pane as the pointer moves left', async ({ mount, page }) => {
    const pane = await mount(SplitPaneStory, { props: { dir: 'rtl' } });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    const drag = await dragBy(page, handle, -60);
    await drag.release();
    await expect(handle).toHaveAttribute('aria-valuenow', '320');
  });

  test('widens an end pane on ArrowRight, because its edge is on the right', async ({
    mount,
    page,
  }) => {
    const pane = await mount(SplitPaneStory, { props: { dir: 'rtl', side: 'end' } });
    const handle = pane.getByRole('separator', { name: 'Resize Layers' });
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '284');
  });
});
