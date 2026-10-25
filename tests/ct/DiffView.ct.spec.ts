/**
 * DiffView by keys: a long value opens from its button with Enter and closes
 * with Space, and the focus stays on the button between the two.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import DiffView from '../../src/lib/components/DiffView.svelte';
import { tabTo } from './keys.js';

test.describe('DiffView by keys', () => {
  test('opens a long value with Enter and closes it with Space', async ({ mount, page }) => {
    const long = 'a'.repeat(1000);
    const view = await mount(DiffView, {
      props: { changes: [{ kind: 'added', label: 'Body', value: long }] },
    });
    const value = view.locator('p[dir="auto"]');
    await expect(value).toHaveText(long.slice(0, 400));
    await tabTo(page, view.getByRole('button', { name: 'Show all' }));
    await page.keyboard.press('Enter');
    await expect(value).toHaveText(long);
    const less = view.getByRole('button', { name: 'Show less' });
    await expect(less).toBeFocused();
    await expect(less).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(value).toHaveText(long.slice(0, 400));
    await expect(view.getByRole('button', { name: 'Show all' })).toBeFocused();
  });
});
