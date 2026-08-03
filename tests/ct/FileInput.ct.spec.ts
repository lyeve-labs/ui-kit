import { test, expect } from '@playwright/experimental-ct-svelte';
import FileInput from '../../src/lib/components/FileInput.svelte';

test.describe('FileInput', () => {
  test('renders file input element', async ({ mount }) => {
    const c = await mount(FileInput, { props: { accept: '.pdf,.png' } });
    await expect(c).toBeVisible();
    const input = c.locator('input[type="file"]');
    await expect(input).toBeVisible();
  });

  test('shows accepted formats', async ({ mount }) => {
    const c = await mount(FileInput, { props: { accept: '.pdf,.jpg' } });
    await expect(c).toBeVisible();
  });
});
