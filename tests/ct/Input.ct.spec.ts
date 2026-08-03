/**
 * Input component test — browser-rendered interaction + accessibility.
 *
 * Playwright Component Testing exercises real browser behavior that jsdom cannot:
 * typing, disabled state, and error display.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Input from '../../src/lib/components/Input.svelte';

test.describe('Input', () => {
  test('renders with placeholder', async ({ mount }) => {
    const component = await mount(Input, {
      props: { placeholder: 'Enter your name' },
    });
    const input = component.locator('input');
    await expect(input).toHaveAttribute('placeholder', 'Enter your name');
  });

  test('types text and reflects value', async ({ mount }) => {
    const component = await mount(Input, {
      props: { placeholder: 'Type here' },
    });
    const input = component.locator('input');
    await input.fill('hello world');
    await expect(input).toHaveValue('hello world');
  });

  test('error state displays message', async ({ mount }) => {
    const component = await mount(Input, {
      props: { error: 'This field is required' },
    });
    await expect(component).toContainText('This field is required');
    await expect(component.locator('input')).toHaveAttribute('aria-invalid', 'true');
  });

  test('disabled prevents typing', async ({ mount }) => {
    const component = await mount(Input, {
      props: { disabled: true, placeholder: 'Disabled' },
    });
    const input = component.locator('input');
    await expect(input).toBeDisabled();
  });
});
