/**
 * Checkbox component test - browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * click toggling, disabled-state enforcement, and label rendering.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Checkbox from '../../src/lib/components/Checkbox.svelte';

test.describe('Checkbox', () => {
  test('renders with label', async ({ mount }) => {
    const component = await mount(Checkbox, {
      props: { label: 'Accept terms' },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Accept terms');
  });

  test('click toggles checked state', async ({ mount }) => {
    let toggled = false;
    const component = await mount(Checkbox, {
      props: {
        label: 'Toggle me',
        checked: false,
        onchange: () => {
          toggled = true;
        },
      },
    });
    await component.locator('label').click();
    expect(toggled).toBe(true);
  });

  test('disabled prevents toggle', async ({ mount }) => {
    let toggled = false;
    const component = await mount(Checkbox, {
      props: {
        label: 'Disabled option',
        checked: false,
        disabled: true,
        onchange: () => {
          toggled = true;
        },
      },
    });
    await component.locator('label').click();
    expect(toggled).toBe(false);
  });
});
