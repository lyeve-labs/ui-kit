/**
 * Select component test — browser-rendered interaction.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom
 * cannot: native select open, option selection, and keyboard navigation.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Select from '../../src/lib/components/Select.svelte';

test.describe('Select', () => {
  test('renders with options', async ({ mount }) => {
    const component = await mount(Select, {
      slots: {
        default: `
          <option value="">Choose</option>
          <option value="1">Alpha</option>
          <option value="2">Beta</option>
        `,
      },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Alpha');
    await expect(component).toContainText('Beta');
  });

  test('selectOption fires onchange', async ({ mount }) => {
    let selected = '';
    const component = await mount(Select, {
      props: { onchange: (e: Event & { currentTarget: HTMLSelectElement }) => { selected = e.currentTarget.value; } },
      slots: {
        default: `
          <option value="">Choose</option>
          <option value="1">Alpha</option>
          <option value="2">Beta</option>
        `,
      },
    });
    await component.locator('select').selectOption('2');
    expect(selected).toBe('2');
  });

  test('keyboard arrow and enter selects value', async ({ mount, page }) => {
    let selected = '';
    const component = await mount(Select, {
      props: { onchange: (e: Event & { currentTarget: HTMLSelectElement }) => { selected = e.currentTarget.value; } },
      slots: {
        default: `
          <option value="">Choose</option>
          <option value="1">Alpha</option>
          <option value="2">Beta</option>
        `,
      },
    });
    const selectEl = component.locator('select');
    await selectEl.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(selected).toBe('1');
  });
});