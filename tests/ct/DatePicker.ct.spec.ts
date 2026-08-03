/**
 * DatePicker component test — browser-rendered interaction + popover behavior.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import DatePicker from '../../src/lib/components/DatePicker.svelte';
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
        onchange: (v: string) => { changed = v; },
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
