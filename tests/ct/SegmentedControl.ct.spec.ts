/**
 * A segmented control in a side panel narrower than its labels broke each
 * label inside its segment ("Read and / write"), so every segment grew to two
 * lines and the row read as a block of fragments. A label stays on one line:
 * a row that does not fit stacks its options instead, and lays them in a row
 * again once its container has the room.
 */
import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';
import SegmentedFitStory from './SegmentedFitStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCE = fileURLToPath(
  new URL('../../src/lib/components/SegmentedControl.svelte', import.meta.url),
);

/** Each segment's box and the height of one line of its label. */
function boxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-segment]')].map((el) => {
      const box = el.getBoundingClientRect();
      // A grid item is a block, so it reports one rect however many lines it
      // holds: its height against its line height counts them.
      const label = el.querySelector('span.grid > span:last-child')!;
      const line = parseFloat(getComputedStyle(label).lineHeight);
      return {
        top: Math.round(box.top),
        left: Math.round(box.left),
        lines: Math.round(label.getBoundingClientRect().height / line),
        overflows: el.scrollWidth > el.clientWidth,
      };
    }),
  );
}

async function styled(mounted: Locator, page: Page) {
  await styleWithKit(page, 'dark', [SOURCE]);
  await expect(mounted).toBeVisible();
}

test.describe('SegmentedControl fit', () => {
  test('lays the options in one row when they fit', async ({ mount, page }) => {
    await styled(await mount(SegmentedFitStory, { props: { width: 640 } }), page);
    const segs = await boxes(page);
    expect(new Set(segs.map((s) => s.top)).size).toBe(1);
    expect(segs.every((s) => s.lines === 1 && !s.overflows)).toBe(true);
  });

  test('keeps each label on one line and stacks the options when they do not fit', async ({
    mount,
    page,
  }) => {
    await styled(await mount(SegmentedFitStory, { props: { width: 220 } }), page);
    await expect.poll(async () => new Set((await boxes(page)).map((s) => s.top)).size).toBe(4);
    const segs = await boxes(page);
    expect(segs.every((s) => s.lines === 1 && !s.overflows)).toBe(true);
    expect(new Set(segs.map((s) => s.left)).size).toBe(1);
    const frame = await page.locator('#frame').evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(frame, 'the control stays inside its frame').toBe(true);
  });

  test('goes back to one row when its container widens', async ({ mount, page }) => {
    await styled(await mount(SegmentedFitStory, { props: { width: 220 } }), page);
    await expect.poll(async () => new Set((await boxes(page)).map((s) => s.top)).size).toBe(4);
    await page.locator('#frame').evaluate((el) => (el.style.width = '640px'));
    await expect.poll(async () => new Set((await boxes(page)).map((s) => s.top)).size).toBe(1);
  });

  for (const [layout, narrow, wide] of [
    ['row', 300, 640],
    ['grid', 440, 1000],
  ] as const) {
    test(`stacks in a ${layout} that is too narrow and lies down again when it widens`, async ({
      mount,
      page,
    }) => {
      // A control sized by its content refused to shrink once its labels kept
      // to one line, so a flex row or a grid column ran past its container
      // instead of stacking.
      await styled(await mount(SegmentedFitStory, { props: { width: narrow, layout } }), page);
      await expect.poll(async () => new Set((await boxes(page)).map((s) => s.top)).size).toBe(4);
      const frame = await page.locator('#frame').evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(frame, 'the control stays inside its frame').toBe(true);
      await page.locator('#frame').evaluate((el, w) => (el.style.width = `${w}px`), wide);
      await expect.poll(async () => new Set((await boxes(page)).map((s) => s.top)).size).toBe(1);
    });
  }

  test('picks with the pointer and draws no focus ring for it', async ({ mount, page }) => {
    await styled(await mount(SegmentedFitStory, { props: { width: 640 } }), page);
    await page.getByRole('radio', { name: 'Write only' }).click();
    await expect(page.getByTestId('value')).toHaveText('write');
    const ring = await page.evaluate(
      () => document.activeElement?.matches(':focus-visible') ?? false,
    );
    expect(ring).toBe(false);
  });
});

test.describe('SegmentedControl press', () => {
  /*
   * Chromium matches :active on a natively disabled button while it is held,
   * and a disabled row of links carries aria-disabled on anchors that still
   * match :active. On a touch screen the held color is the only sign a press
   * landed, so a disabled segment must keep the color it shows under the
   * pointer. The enabled row proves the press shows on a segment that takes it.
   */
  for (const kind of ['radio', 'link'] as const) {
    for (const disabled of [false, true]) {
      const state = disabled ? 'disabled' : 'enabled';
      test(`a held ${state} ${kind} segment ${disabled ? 'keeps its resting color' : 'shows its held color'}`, async ({
        mount,
        page,
      }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const options = [
          { value: 'light', label: 'Light', href: kind === 'link' ? '?theme=light' : undefined },
          { value: 'dark', label: 'Dark', href: kind === 'link' ? '?theme=dark' : undefined },
        ];
        const mounted = await mount(SegmentedControl, {
          props: { label: 'Theme', value: 'dark', options, disabled },
        });
        await styled(mounted, page);
        await page.addStyleTag({ content: '* { transition: none !important; }' });
        const segment = page.locator('[data-segment]').first();
        if (disabled && kind === 'radio') await expect(segment).toBeDisabled();
        if (disabled && kind === 'link')
          await expect(segment).toHaveAttribute('aria-disabled', 'true');
        const paint = () =>
          segment.evaluate((el) => {
            const s = getComputedStyle(el);
            return `${s.backgroundColor} ${s.color}`;
          });
        const matches = (selector: string) => () =>
          segment.evaluate((el, sel) => el.matches(sel), selector);
        const box = (await segment.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await expect.poll(matches(':hover'), { message: 'hover' }).toBe(true);
        const over = await paint();
        await page.mouse.down();
        if (disabled) {
          await expect.poll(matches(':active'), { message: 'held' }).toBe(true);
          expect(await paint()).toBe(over);
        } else {
          await expect.poll(paint, { message: 'held' }).not.toBe(over);
        }
        await page.mouse.up();
      });
    }
  }
});
