/**
 * Toaster component test — browser-rendered interaction + auto-dismiss.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom
 * cannot: mount rendering, auto-dismiss timer accuracy, and close-button
 * interaction.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Toaster from '../../src/lib/components/Toaster.svelte';
import { toast } from '../stores/toast.svelte';

test.describe('Toaster', () => {
  test('renders toast message', async ({ mount }) => {
    const component = await mount(Toaster);
    toast.push('info', 'Test toast message', 0);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Test toast message');
    toast.dismiss(toast.items[0].id);
  });

  test('auto-dismisses after timeout', async ({ mount, page }) => {
    const component = await mount(Toaster);
    toast.push('info', 'Auto-dismiss me', 50);
    await expect(component).toContainText('Auto-dismiss me');
    await page.waitForTimeout(120);
    await expect(component).not.toContainText('Auto-dismiss me');
  });

  test('close button dismisses immediately', async ({ mount }) => {
    const component = await mount(Toaster);
    toast.push('info', 'Close me now', 0);
    await expect(component).toContainText('Close me now');
    const closeBtn = component.locator('[aria-label="Dismiss"]');
    await closeBtn.click();
    await expect(component).not.toContainText('Close me now');
  });
});
