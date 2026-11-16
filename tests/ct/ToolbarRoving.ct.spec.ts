/**
 * A roving toolbar, its pressed toggles and its checkbox menu in a browser.
 *
 * jsdom has no Tab order, so whether the row is one Tab stop is read here. The
 * pressed border is read from the computed style in both palettes and
 * measured against the surface the row sits on, the 3:1 a control's state
 * needs.
 */
import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import ToolbarRovingStory from './ToolbarRovingStory.svelte';
import { styleWithKit } from './kit-css.js';

// The open menu carries classes the first paint does not.
const SOURCES = ['../../src/lib/components/Dropdown.svelte'].map((p) =>
  fileURLToPath(new URL(p, import.meta.url)),
);

const focused = (page: Page) =>
  page.evaluate(
    () =>
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent?.trim(),
  );

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((c) => {
    const s = Number(c) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const style = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { border: s.borderTopColor, bg: s.backgroundColor, transition: s.transitionProperty };
  });

test.describe('a roving Toolbar', () => {
  test('is one Tab stop, and the arrows skip a disabled button', async ({ mount, page }) => {
    await mount(ToolbarRovingStory);
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('Bold');
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('After');
    await page.keyboard.press('Shift+Tab');
    expect(await focused(page)).toBe('Bold');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Add link');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('More');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Bold');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('More');
    await page.keyboard.press('Shift+Tab');
    expect(await focused(page)).toBe('Before');
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('More');
  });

  test('changes a pressed state in place and keeps the focus', async ({ mount, page }) => {
    await mount(ToolbarRovingStory);
    const italic = page.getByRole('button', { name: 'Italic' });
    await italic.focus();
    await page.keyboard.press('Space');
    await expect(italic).toHaveAttribute('aria-pressed', 'true');
    expect(await focused(page)).toBe('Italic');
  });

  test('opens a menu of checkbox rows from the row', async ({ mount, page }) => {
    await mount(ToolbarRovingStory);
    await page.getByRole('button', { name: 'More' }).focus();
    await page.keyboard.press('ArrowDown');
    const wrap = page.getByRole('menuitemcheckbox', { name: 'Wrap lines' });
    await expect(wrap).toBeFocused();
    await expect(wrap).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('menuitem', { name: 'Clear formatting' })).toBeVisible();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('menuitemcheckbox', { name: 'Wrap lines' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`draws a pressed ghost toggle at 3:1 on the surface in ${theme}`, async ({
      mount,
      page,
    }) => {
      await mount(ToolbarRovingStory);
      await styleWithKit(page, theme, SOURCES);
      await page.mouse.move(1, 1);
      // The sheet arrives after the first paint, so every color eases in from
      // the unstyled one under transition-colors. Read them once that ends.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      const surface = (await style(page.getByTestId('surface'))).bg;
      const on = await style(page.getByRole('button', { name: 'Bold' }));
      const off = await style(page.getByRole('button', { name: 'Italic' }));
      expect(off.border).toBe('rgba(0, 0, 0, 0)');
      expect(on.border).not.toBe(off.border);
      expect(ratio(on.border, surface), `${on.border} on ${surface}`).toBeGreaterThanOrEqual(3);
      expect(on.transition).toContain('border-color');
    });
  }
});
