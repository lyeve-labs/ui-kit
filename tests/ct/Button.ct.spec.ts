/**
 * Button component test: browser-rendered interaction + state.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import Button from '../../src/lib/components/Button.svelte';
import ButtonLoadingStory from './ButtonLoadingStory.svelte';
import ButtonStatesStory from './ButtonStatesStory.svelte';
import { styleWithKit } from './kit-css.js';

const VARIANTS = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'] as const;

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

  /*
   * On a touch screen the held color is the only sign a press landed, so a
   * button that ignores the press must not show it. Chromium matches :active
   * on a natively disabled button while it is held, and a loading button
   * stays enabled, so neither state may paint its pressed step. The pointer
   * stays over the button, so the color under the pointer is the baseline,
   * and an idle button of each variant proves the press shows. Transitions
   * are off, so the paint read once :active matches is the settled one.
   */
  test('a loading or disabled button shows no held color', async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(ButtonStatesStory);
    await styleWithKit(page, 'dark');
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    for (const variant of VARIANTS) {
      for (const state of ['idle', 'loading', 'disabled'] as const) {
        const button = page.getByTestId(`${variant}-${state}`);
        const paint = () =>
          button.evaluate((el) => {
            const s = getComputedStyle(el);
            return `${s.backgroundColor} ${s.color} ${s.filter}`;
          });
        const matches = (selector: string) => () =>
          button.evaluate((el, sel) => el.matches(sel), selector);
        const box = (await button.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await expect.poll(matches(':hover'), { message: `${variant} ${state} hover` }).toBe(true);
        const over = await paint();
        await page.mouse.down();
        if (state === 'idle') {
          await expect.poll(paint, { message: `${variant} idle` }).not.toBe(over);
        } else {
          await expect.poll(matches(':active'), { message: `${variant} ${state} held` }).toBe(true);
          expect.soft(await paint(), `${variant} ${state}`).toBe(over);
        }
        await page.mouse.up();
      }
    }
  });

  /*
   * In forced colors the browser draws a natively disabled button in GrayText
   * and does nothing for aria-disabled, so a loading button kept ButtonText
   * and read as live.
   */
  test('a loading button draws in GrayText in forced colors, as a disabled one does', async ({
    mount,
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await mount(ButtonStatesStory);
    await styleWithKit(page, 'dark');
    const ink = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.color} ${s.borderTopColor}`;
      });
    for (const variant of VARIANTS) {
      const disabled = await ink(`${variant}-disabled`);
      expect(await ink(`${variant}-idle`), `${variant} idle`).not.toBe(disabled);
      expect(await ink(`${variant}-loading`), `${variant} loading`).toBe(disabled);
    }
  });
});
