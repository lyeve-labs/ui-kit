/**
 * ColorField by keys: a typed color is read when Tab leaves the field, and
 * the swatches take the arrows and Space the way any radio group does.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import ColorField from '../../src/lib/components/ColorField.svelte';
import { tabTo } from './keys.js';

const THEME = [
  { value: 'brand', label: 'Brand', color: '#2F6FEB' },
  { value: 'accent', label: 'Accent', color: '#F59E0B' },
  { value: 'surface', label: 'Surface', color: '#FFFFFF' },
];

test.describe('ColorField by keys', () => {
  test('reads a typed color when Tab leaves the field', async ({ mount, page }) => {
    const field = await mount(ColorField, { props: { label: 'Brand', hint: 'Your main color.' } });
    const input = field.getByLabel('Brand');
    await tabTo(page, input);
    await page.keyboard.type('2f6');
    await page.keyboard.press('Tab');
    await expect(input).toHaveValue('#22FF66');
    await expect(input).not.toHaveAttribute('aria-invalid');
  });

  test('refuses text that is no color when Tab leaves the field', async ({ mount, page }) => {
    const field = await mount(ColorField, { props: { label: 'Brand', hint: 'Your main color.' } });
    const input = field.getByLabel('Brand');
    await tabTo(page, input);
    await page.keyboard.type('blue');
    await page.keyboard.press('Tab');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(
      field.getByText('Enter a color as # and six hex digits, such as #2F6FEB.'),
    ).toBeVisible();
    await expect(input).toHaveValue('blue');
  });

  test('moves the pick across the swatches with the arrows', async ({ mount, page }) => {
    const field = await mount(ColorField, {
      props: { label: 'Background', swatches: THEME, value: 'brand' },
    });
    await tabTo(page, field.getByRole('radio', { name: 'Brand' }));
    await page.keyboard.press('ArrowRight');
    const accent = field.getByRole('radio', { name: 'Accent' });
    await expect(accent).toBeChecked();
    await expect(accent).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(field.getByRole('radio', { name: 'Surface' })).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(accent).toBeChecked();
  });

  test('picks a swatch with Space when the stored color is gone from the theme', async ({
    mount,
    page,
  }) => {
    const field = await mount(ColorField, {
      props: { label: 'Background', swatches: THEME, value: 'brand-old' },
    });
    const brand = field.getByRole('radio', { name: 'Brand' });
    await tabTo(page, brand);
    await expect(brand).not.toBeChecked();
    await page.keyboard.press('Space');
    await expect(brand).toBeChecked();
    await expect(field.getByText(/no longer in the theme/)).toHaveCount(0);
  });
});
