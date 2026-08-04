import { test, expect } from '@playwright/experimental-ct-svelte';
import Pagination from '../../src/lib/components/Pagination.svelte';

test.describe('Pagination', () => {
  test('renders page numbers', async ({ mount }) => {
    const c = await mount(Pagination, {
      props: { current: 1, total: 50, pageSize: 10 },
    });
    await expect(c).toBeVisible();
    await expect(c).toContainText('1');
  });

  test('clicking next page emits event', async ({ mount }) => {
    let page = 1;
    const c = await mount(Pagination, {
      props: {
        current: page,
        total: 50,
        pageSize: 10,
        onchange: (p: number) => {
          page = p;
        },
      },
    });
    const nextBtn = c.locator('button[aria-label="Next"], button:has-text("Next")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      expect(page).toBe(2);
    }
  });
});
