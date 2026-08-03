/**
 * Autocomplete component test — browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * focus management, keyboard navigation, ARIA attribute correctness, and
 * visual rendering.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Autocomplete from '../../src/lib/components/Autocomplete.svelte';

test.describe('Autocomplete', () => {
  test('renders with options and empty value', async ({ mount }) => {
    const component = await mount(Autocomplete, {
      props: { options: [{ label: 'Item 1', value: '1' }], value: '' },
    });
    await expect(component).toBeVisible();
    await expect(component.locator('input[role="combobox"]')).toBeVisible();
  });

  test('click opens dropdown and selects option', async ({ mount }) => {
    let selected = '';
    const component = await mount(Autocomplete, {
      props: {
        options: [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }],
        value: '',
        onchange: (v: string) => { selected = v; },
      },
    });
    await component.locator('input[role="combobox"]').click();
    await expect(component.locator('[role="listbox"]')).toBeVisible();
    await component.locator('[role="option"]').first().click();
    await expect(component.locator('[role="listbox"]')).not.toBeVisible();
    expect(selected).toBe('a');
  });

  test('keyboard navigation selects option', async ({ mount, page }) => {
    let selected = '';
    await mount(Autocomplete, {
      props: {
        options: [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }],
        value: '',
        onchange: (v: string) => { selected = v; },
      },
    });
    await page.keyboard.press('Tab');
    await expect(page.locator('[role="listbox"]')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(selected).toBe('a');
  });
});
