/**
 * DatePicker component test: browser-rendered interaction + popover behavior.
 */
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import DatePicker from '../../src/lib/components/DatePicker.svelte';
import DatePickerEdgeStory from './DatePickerEdgeStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = [
  '../../src/lib/components/DatePicker.svelte',
  '../../src/lib/internal/panel.ts',
  '../../src/lib/internal/field.ts',
].map((p) => fileURLToPath(new URL(p, import.meta.url)));

/** The calendar's box, the field's and the room inside the scrolling box, after the picker opens. */
async function openAtEdge(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await styleWithKit(page, 'dark', SOURCES);
  await page.locator('#edge').click();
  const calendar = page.getByRole('dialog', { name: 'Choose a date' });
  await expect(calendar).toBeVisible();
  // The entrance still runs a frame under reduced motion, and the box is read
  // once it has settled where placePanel put it.
  await calendar.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return page.evaluate(() => {
    const clip = document.getElementById('clip')!;
    const box = clip.getBoundingClientRect();
    const field = document.getElementById('edge')!.getBoundingClientRect();
    const panel = document.querySelector('[role="dialog"]')!.getBoundingClientRect();
    const inner = box.left + clip.clientLeft;
    return {
      roomLeft: inner,
      roomRight: inner + clip.clientWidth,
      field: { left: field.left, right: field.right },
      panel: { left: panel.left, right: panel.right },
    };
  });
}

test.describe('DatePicker at the edge of a scrolling box', () => {
  test('aligns the calendar with the end of its field, clear of the edge', async ({
    mount,
    page,
  }) => {
    await mount(DatePickerEdgeStory);
    const at = await openAtEdge(page);
    expect(at.panel.right).toBeLessThanOrEqual(at.roomRight - 8);
    expect(Math.abs(at.panel.right - at.field.right)).toBeLessThanOrEqual(1);
  });

  test('stays inside the box when the field touches its edge', async ({ mount, page }) => {
    await mount(DatePickerEdgeStory, { props: { inset: 0 } });
    const at = await openAtEdge(page);
    expect(at.panel.right).toBeLessThanOrEqual(at.roomRight);
    expect(at.panel.left).toBeGreaterThanOrEqual(at.roomLeft);
  });

  test('aligns with the field start in a right-to-left page', async ({ mount, page }) => {
    await mount(DatePickerEdgeStory, { props: { dir: 'rtl' } });
    const at = await openAtEdge(page);
    expect(at.panel.left).toBeGreaterThanOrEqual(at.roomLeft + 8);
    expect(Math.abs(at.panel.left - at.field.left)).toBeLessThanOrEqual(1);
  });
});

test.describe('DatePicker', () => {
  test('renders with value', async ({ mount }) => {
    const component = await mount(DatePicker, {
      props: { value: '2026-01-01' },
    });
    await expect(component).toBeVisible();
    await expect(component.locator('button').first()).toContainText('Jan 1, 2026');
  });

  test('opens calendar on trigger click', async ({ mount }) => {
    const component = await mount(DatePicker, {
      props: { value: '2026-07-15' },
    });
    await component.locator('button').first().click();
    await expect(component).toContainText('July 2026');
  });

  test('picking a date updates value and closes calendar', async ({ mount }) => {
    let changed = '';
    const component = await mount(DatePicker, {
      props: {
        value: '2026-01-01',
        onchange: (v: string) => {
          changed = v;
        },
      },
    });
    await component.locator('button').first().click();
    const day15 = component.locator('button[aria-label="2026-01-15"]');
    if (await day15.isVisible()) {
      await day15.click();
      expect(changed).toBe('2026-01-15');
      await expect(component).not.toContainText('January 2026');
    }
  });

  test('escape key closes calendar', async ({ mount, page }) => {
    const component = await mount(DatePicker, {
      props: { value: '2026-06-01' },
    });
    await component.locator('button').first().click();
    await expect(component).toContainText('June 2026');
    await page.keyboard.press('Escape');
    await expect(component).not.toContainText('June 2026');
  });
});
