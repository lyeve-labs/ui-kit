/**
 * Tabs component test: browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * ARIA role correctness, keyboard navigation, and click handling.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Tabs from '../../src/lib/components/Tabs.svelte';
import TabsBelowFoldStory from './TabsBelowFoldStory.svelte';

test.describe('Tabs', () => {
  const items = [
    { id: '1', label: 'Tab 1' },
    { id: '2', label: 'Tab 2' },
  ];

  test('renders with ARIA tab roles', async ({ mount }) => {
    const component = await mount(Tabs, {
      props: {
        items,
        active: '1',
        onchange: () => {},
      },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Tab 1');
    await expect(component.locator('[role="tab"]')).toHaveCount(2);
    await expect(component.locator('[role="tab"]').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('clicking a tab fires onchange with its id', async ({ mount }) => {
    let selected = '';
    const component = await mount(Tabs, {
      props: {
        items,
        active: '1',
        onchange: (id: string) => {
          selected = id;
        },
      },
    });
    await component.locator('text=Tab 2').click();
    expect(selected).toBe('2');
  });

  test('keyboard Enter on focused tab fires onchange', async ({ mount, page }) => {
    let selected = '';
    const component = await mount(Tabs, {
      props: {
        items,
        active: '1',
        onchange: (id: string) => {
          selected = id;
        },
      },
    });
    await component.locator('[role="tab"]').nth(1).focus();
    await page.keyboard.press('Enter');
    expect(selected).toBe('2');
  });

  test('takes one Tab press and walks by the arrows without choosing', async ({ mount, page }) => {
    const chosen: string[] = [];
    const three = [...items, { id: '3', label: 'Tab 3' }];
    const component = await mount(Tabs, {
      props: { items: three, active: '2', onchange: (id: string) => chosen.push(id) },
    });
    const tabs = component.locator('[role="tab"]');

    await page.keyboard.press('Tab');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toBeFocused();
    expect(chosen).toEqual([]);

    await page.keyboard.press('Enter');
    expect(chosen).toEqual(['1']);

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).not.toBe('tab');
  });

  test('a strip below the fold leaves the page at the top', async ({ mount, page }) => {
    await mount(TabsBelowFoldStory);
    await expect(page.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
