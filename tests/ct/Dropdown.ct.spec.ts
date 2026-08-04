/**
 * Dropdown component test — browser-rendered interaction.
 *
 * Playwright Component Testing exercises real browser behavior that
 * jsdom cannot: menu toggle, focus management, keyboard navigation.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Dropdown from '../../src/lib/components/Dropdown.svelte';

test.describe('Dropdown', () => {
  test('renders with trigger', async ({ mount }) => {
    const component = await mount(Dropdown, {
      props: { items: [{ label: 'Option 1', onclick: () => {} }] },
      slots: { trigger: '<button>Select</button>' },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Select');
  });

  test('opens menu on trigger click', async ({ mount }) => {
    let clicked = false;
    const component = await mount(Dropdown, {
      props: {
        items: [
          {
            label: 'Option 1',
            onclick: () => {
              clicked = true;
            },
          },
        ],
      },
      slots: { trigger: '<button>Select</button>' },
    });
    await component.locator('button').click();
    await expect(component.locator('[role="menu"]')).toBeVisible();
    await expect(component).toContainText('Option 1');
    await component.locator('[role="menuitem"]').click();
    expect(clicked).toBe(true);
  });

  test('escape key closes menu', async ({ mount, page }) => {
    const component = await mount(Dropdown, {
      props: { items: [{ label: 'Option 1', onclick: () => {} }] },
      slots: { trigger: '<button>Select</button>' },
    });
    await component.locator('button').click();
    await expect(component.locator('[role="menu"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(component.locator('[role="menu"]')).not.toBeVisible();
  });
});
