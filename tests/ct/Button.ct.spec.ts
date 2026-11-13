/**
 * Button component test: browser-rendered interaction + state.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Button from '../../src/lib/components/Button.svelte';
import ButtonLoadingStory from './ButtonLoadingStory.svelte';

test.describe('Button', () => {
  test('renders with label', async ({ mount }) => {
    const component = await mount(Button, {
      slots: { children: 'Submit' },
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
      slots: { children: 'Click me' },
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
      slots: { children: 'Disabled' },
    });
    await expect(component).toBeDisabled();
    await component.click({ force: true });
    expect(clicked).toBe(false);
  });

  test('loading spinner when loading=true', async ({ mount }) => {
    const component = await mount(Button, {
      props: { loading: true },
      slots: { children: 'Saving' },
    });
    await expect(component).toHaveAttribute('aria-disabled', 'true');
    await expect(component.locator('svg.animate-spin')).toBeVisible();
    await expect(component).toContainText('Saving');
  });

  /*
   * A browser moves focus off a control that turns disabled. A loading
   * button stays enabled, so focus stays on it, and it refuses the click,
   * Enter and Space itself, including the Enter in a field that would
   * submit the form through it.
   */
  test('keeps focus while loading and refuses every second submit', async ({ mount, page }) => {
    const component = await mount(ButtonLoadingStory);
    const save = component.getByRole('button', { name: 'Save' });
    const submits = component.getByTestId('submits');
    await save.focus();
    await page.keyboard.press('Enter');
    await expect(submits).toHaveText('1');
    await expect(save).toHaveAttribute('aria-busy', 'true');
    await expect(save).toBeFocused();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await save.click({ force: true });
    await component.getByRole('textbox', { name: 'Name' }).press('Enter');
    await expect(submits).toHaveText('1');
  });

  test('a loading button ignores the click, Enter and Space', async ({ mount, page }) => {
    const component = await mount(ButtonLoadingStory);
    await component.getByRole('textbox', { name: 'Name' }).press('Enter');
    const test = component.getByRole('button', { name: 'Test' });
    await test.focus();
    await expect(test).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await test.click({ force: true });
    await expect(component.getByTestId('clicks')).toHaveText('0');
  });
});
