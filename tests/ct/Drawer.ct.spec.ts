/**
 * Drawer component test - browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * focus management, keyboard navigation, ARIA attribute correctness, and
 * visual rendering.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Drawer from '../../src/lib/components/Drawer.svelte';

test.describe('Drawer', () => {
  test('renders when open', async ({ mount }) => {
    const component = await mount(Drawer, {
      props: { open: true, title: 'Test Drawer' },
      slots: { default: 'Drawer content' },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Test Drawer');
  });

  test('does not render when closed', async ({ mount }) => {
    const component = await mount(Drawer, {
      props: { open: false, title: 'Hidden Drawer' },
      slots: { default: 'Should not show' },
    });
    await expect(component).not.toBeVisible();
  });

  test('overlay click closes drawer', async ({ mount }) => {
    let closed = false;
    const component = await mount(Drawer, {
      props: {
        open: true,
        title: 'Closable Drawer',
        onclose: () => {
          closed = true;
        },
      },
      slots: { default: 'Click overlay to close' },
    });
    const overlay = component.locator('[aria-label="Close"]').first();
    await overlay.click();
    expect(closed).toBe(true);
  });

  test('escape key closes drawer', async ({ mount, page }) => {
    let closed = false;
    await mount(Drawer, {
      props: {
        open: true,
        title: 'Esc Drawer',
        onclose: () => {
          closed = true;
        },
      },
      slots: { default: 'Press Escape' },
    });
    await page.keyboard.press('Escape');
    expect(closed).toBe(true);
  });
});
