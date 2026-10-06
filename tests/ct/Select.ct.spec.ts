/**
 * Select component test: browser-rendered interaction.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom
 * cannot: the panel opening, a pick by pointer, and keyboard navigation.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Select from '../../src/lib/components/Select.svelte';

const options = [
  { value: '1', label: 'Alpha' },
  { value: '2', label: 'Beta' },
];

test.describe('Select', () => {
  test('opens the kit panel, never a native list', async ({ mount }) => {
    const component = await mount(Select, { props: { options, placeholder: 'Choose' } });
    await expect(component).toContainText('Choose');
    await component.getByRole('combobox').click();
    await expect(component.getByRole('option', { name: 'Alpha' })).toBeVisible();
    await expect(component.locator('select')).toHaveCount(0);
  });

  test('a pick fires onvaluechange and fills the hidden input', async ({ mount }) => {
    let selected = '';
    const component = await mount(Select, {
      props: { name: 'plan', options, onvaluechange: (v: string) => (selected = v) },
    });
    await component.getByRole('combobox').click();
    await component.getByRole('option', { name: 'Beta' }).click();
    await expect.poll(() => selected).toBe('2');
    await expect(component.locator('input[name="plan"]')).toHaveValue('2');
  });

  test('keyboard arrow and enter selects value', async ({ mount, page }) => {
    let selected = '';
    const component = await mount(Select, {
      props: { options, onvaluechange: (v: string) => (selected = v) },
    });
    await component.getByRole('combobox').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect.poll(() => selected).not.toBe('');
  });
});
