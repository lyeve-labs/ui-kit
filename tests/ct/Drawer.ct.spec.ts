/**
 * Drawer component test: browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * focus management, keyboard navigation, ARIA attribute correctness, and
 * visual rendering.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Drawer from '../../src/lib/components/Drawer.svelte';
import { styleWithKit } from './kit-css.js';

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

/*
 * WCAG 2.5.8 asks for a 24px target under a mouse. The cross was 16px. The
 * glyph sits where it sat before, so the header does not move.
 */
test('gives the close cross a 24px target and keeps the glyph in place', async ({
  mount,
  page,
}) => {
  const drawer = await mount(Drawer, { props: { open: true, title: 'Target' } });
  await styleWithKit(page, 'dark');
  const cross = drawer.getByRole('dialog').getByRole('button', { name: 'Close' });
  const box = (await cross.boundingBox())!;
  const glyph = (await cross.locator('svg').boundingBox())!;
  const panel = (await drawer.getByRole('dialog').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(panel.x + panel.width - (glyph.x + glyph.width)).toBeCloseTo(20, 0);
  expect(glyph.y - panel.y).toBeCloseTo(16, 0);
});
