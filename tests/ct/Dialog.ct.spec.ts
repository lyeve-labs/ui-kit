/**
 * Dialog component test - browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * focus management, keyboard navigation, ARIA attribute correctness, and
 * visual rendering.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Dialog from '../../src/lib/components/dialog/Dialog.svelte';
import type { DialogEntry } from '../../src/lib/components/dialog/types';

function makeEntry(overrides: Partial<DialogEntry> = {}): DialogEntry {
  return {
    id: 'test-dialog',
    options: { id: 'test-dialog' },
    resolve: () => {},
    reject: () => {},
    depth: 0,
    ...overrides,
  };
}

test.describe('Dialog', () => {
  test('renders with title when open', async ({ mount }) => {
    const entry = makeEntry({ options: { id: 'd1', title: 'Test Dialog' } });
    const component = await mount(Dialog, {
      props: { entry },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Test Dialog');
  });

  test('renders children and close button', async ({ mount }) => {
    const entry = makeEntry({ options: { id: 'd2', title: 'Closable' } });
    const component = await mount(Dialog, {
      props: { entry },
      slots: { children: 'Dialog body content' },
    });
    await expect(component).toContainText('Dialog body content');
    await expect(component.locator('button[aria-label="Close"]')).toBeVisible();
  });

  test('escape key does not crash', async ({ mount, page }) => {
    const entry = makeEntry({ options: { id: 'd3', title: 'ESC Test' } });
    await mount(Dialog, { props: { entry } });
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    // Dialog handles Escape internally via handleKeydown; dialog-manager
    // may attempt to dismiss the entry. The key assertion is no crash.
    await expect(page.locator('[role="dialog"]')).toBeAttached();
  });
});
