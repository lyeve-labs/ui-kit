/**
 * Tabs component test — browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * ARIA role correctness, keyboard navigation, and click handling.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Tabs from './Tabs.svelte';

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
    await expect(component.locator('[role="tab"]').first()).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking a tab fires onchange with its id', async ({ mount }) => {
    let selected = '';
    const component = await mount(Tabs, {
      props: {
        items,
        active: '1',
        onchange: (id: string) => { selected = id; },
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
        onchange: (id: string) => { selected = id; },
      },
    });
    await component.locator('[role="tab"]').nth(1).focus();
    await page.keyboard.press('Enter');
    expect(selected).toBe('2');
  });
});
