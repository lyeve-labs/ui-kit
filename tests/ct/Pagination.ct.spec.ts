import { test, expect } from '@playwright/experimental-ct-svelte';
import Pagination from '../../src/lib/components/Pagination.svelte';

test.describe('Pagination', () => {
  test('renders page numbers', async ({ mount }) => {
    const c = await mount(Pagination, {
      props: { page: 1, total: 50, perPage: 10, onchange: () => {} },
    });
    await expect(c).toBeVisible();
    await expect(c).toContainText('1');
  });

  test('clicking next page emits event', async ({ mount }) => {
    let page = 1;
    const c = await mount(Pagination, {
      props: {
        page,
        total: 50,
        perPage: 10,
        onchange: (p: number) => {
          page = p;
        },
      },
    });
    // Asserted unconditionally. The control is always rendered for a list of
    // this length, so guarding the click on isVisible() only hides the case
    // where it stopped being: the guard used to name aria-label="Next", which
    // the component has never rendered, so the body never ran and the test
    // passed having asserted nothing.
    const nextBtn = c.getByLabel('Next page');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    expect(page).toBe(2);
  });

  test('pages by link when given an href builder', async ({ mount }) => {
    const c = await mount(Pagination, {
      props: { page: 2, perPage: 20, hasNext: true, href: (p: number) => `?page=${p}` },
    });
    await expect(c.getByLabel('Next page')).toHaveAttribute('href', '?page=3');
  });
});
