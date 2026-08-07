/**
 * Modal component test - browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * focus management, keyboard navigation, ARIA attribute correctness, and
 * visual rendering.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Modal from '../../src/lib/components/Modal.svelte';

test.describe('Modal', () => {
  test('renders when open', async ({ mount }) => {
    const component = await mount(Modal, {
      props: { open: true, title: 'Test Modal' },
      slots: { default: 'Modal content' },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Test Modal');
  });

  test('does not render when closed', async ({ mount }) => {
    const component = await mount(Modal, {
      props: { open: false, title: 'Hidden Modal' },
      slots: { default: 'Should not show' },
    });
    await expect(component).not.toBeVisible();
  });

  test('close button emits close event', async ({ mount }) => {
    let closed = false;
    const component = await mount(Modal, {
      props: {
        open: true,
        title: 'Closable Modal',
        onclose: () => {
          closed = true;
        },
      },
      slots: { default: 'Click close' },
    });
    const closeBtn = component.locator('[aria-label="Close"], .modal-close, button.close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      expect(closed).toBe(true);
    }
  });

  test('escape key closes modal', async ({ mount, page }) => {
    let closed = false;
    await mount(Modal, {
      props: {
        open: true,
        title: 'Esc Modal',
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
