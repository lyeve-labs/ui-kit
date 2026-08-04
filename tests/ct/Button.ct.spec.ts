/**
 * Button component test — browser-rendered interaction + state.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Button from '../../src/lib/components/Button.svelte';

test.describe('Button', () => {
  test('renders with label', async ({ mount }) => {
    const component = await mount(Button, {
      slots: { default: 'Submit' },
    });
    await expect(component).toBeVisible();
    await expect(component).toContainText('Submit');
  });

  test('click fires onclick', async ({ mount }) => {
    let clicked = false;
    const component = await mount(Button, {
      props: {
        onclick: () => {
          clicked = true;
        },
      },
      slots: { default: 'Click me' },
    });
    await component.click();
    expect(clicked).toBe(true);
  });

  test('disabled state prevents click', async ({ mount }) => {
    let clicked = false;
    const component = await mount(Button, {
      props: {
        disabled: true,
        onclick: () => {
          clicked = true;
        },
      },
      slots: { default: 'Disabled' },
    });
    await expect(component).toBeDisabled();
    await component.click({ force: true });
    expect(clicked).toBe(false);
  });

  test('loading spinner when loading=true', async ({ mount }) => {
    const component = await mount(Button, {
      props: { loading: true },
      slots: { default: 'Saving' },
    });
    await expect(component).toBeDisabled();
    await expect(component.locator('svg.animate-spin')).toBeVisible();
    await expect(component).toContainText('Saving');
  });
});
