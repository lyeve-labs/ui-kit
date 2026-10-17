/**
 * Toaster component test: browser-rendered interaction + auto-dismiss.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom
 * cannot: mount rendering, auto-dismiss timer accuracy, and close-button
 * interaction.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import ToasterStory from './ToasterStory.svelte';

test.describe('Toaster', () => {
  test('renders toast message', async ({ mount }) => {
    const component = await mount(ToasterStory, { props: { message: 'Test toast message' } });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Test toast message');
  });

  test('auto-dismisses after timeout', async ({ mount, page }) => {
    const component = await mount(ToasterStory, {
      props: { message: 'Auto-dismiss me', timeout: 50 },
    });
    await expect(component).toContainText('Auto-dismiss me');
    await page.waitForTimeout(120);
    await expect(component).not.toContainText('Auto-dismiss me');
  });

  test('close button dismisses immediately', async ({ mount }) => {
    const component = await mount(ToasterStory, { props: { message: 'Close me now' } });
    await expect(component).toContainText('Close me now');
    const closeBtn = component.locator('[aria-label="Dismiss"]');
    await closeBtn.click();
    await expect(component).not.toContainText('Close me now');
  });
});
