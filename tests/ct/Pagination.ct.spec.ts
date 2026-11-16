import { test, expect } from '@playwright/experimental-ct-svelte';
import Pagination from '../../src/lib/components/Pagination.svelte';
import PaginationLinks from './PaginationLinks.svelte';
import { styleWithKit } from './kit-css.js';

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
    const c = await mount(PaginationLinks, { props: { page: 2, hasNext: true } });
    await expect(c.getByLabel('Next page')).toHaveAttribute('href', '?page=3');
  });

  /*
   * Chromium matches :active on a natively disabled button while it is held,
   * and previous is disabled on the first page. On a touch screen the held
   * color is the only sign a press landed, so a step that goes nowhere must
   * keep the color it shows under the pointer. A numbered page proves the
   * press shows on a control that takes it.
   */
  test('a disabled step shows no held color', async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const c = await mount(Pagination, {
      props: { page: 1, total: 50, perPage: 10, onchange: () => {} },
    });
    await styleWithKit(page, 'dark');
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    const cases = [
      { control: c.getByRole('button', { name: '2', exact: true }), takesPress: true },
      { control: c.getByLabel('Previous page'), takesPress: false },
    ];
    await expect(cases[1].control).toBeDisabled();
    for (const { control, takesPress } of cases) {
      const name = takesPress ? 'page 2' : 'disabled previous';
      const paint = () =>
        control.evaluate((el) => {
          const s = getComputedStyle(el);
          return `${s.backgroundColor} ${s.color}`;
        });
      const matches = (selector: string) => () =>
        control.evaluate((el, sel) => el.matches(sel), selector);
      const box = (await control.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect.poll(matches(':hover'), { message: `${name} hover` }).toBe(true);
      const over = await paint();
      await page.mouse.down();
      if (takesPress) {
        await expect.poll(paint, { message: `${name} held` }).not.toBe(over);
      } else {
        await expect.poll(matches(':active'), { message: `${name} held` }).toBe(true);
        expect(await paint(), name).toBe(over);
      }
      await page.mouse.up();
    }
  });
});
