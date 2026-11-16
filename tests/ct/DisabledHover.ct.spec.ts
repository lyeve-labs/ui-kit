/**
 * A control that cannot be used does not answer the pointer.
 *
 * A disabled or loading control under a mouse kept taking its hover color, so
 * it reacted as if a press would do something. Each case hovers such a control
 * with a real mouse and reads its fill, text, border and filter against what
 * it draws at rest. An enabled control of the same kind proves the hover step
 * paints at all, so a case cannot pass on markup that never styled it.
 */
import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import DisabledHoverStory from './DisabledHoverStory.svelte';
import { styleWithKit } from './kit-css.js';

// The open menu and calendar carry classes the first paint does not.
const SOURCES = [
  '../../src/lib/components/Dropdown.svelte',
  '../../src/lib/components/DatePicker.svelte',
  '../../src/lib/internal/panel.ts',
].map((p) => fileURLToPath(new URL(p, import.meta.url)));

const VARIANTS = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'] as const;

interface Case {
  name: string;
  open?: (page: Page) => Promise<void>;
  /** The control that cannot be used. */
  still: (page: Page) => Locator;
  /** An enabled control of the same kind. */
  live: (page: Page) => Locator;
  /** Parts inside the hovered element whose borders are read as well. */
  parts?: string;
}

const within = (page: Page, id: string) => page.getByTestId(id);

const CASES: Case[] = [
  ...VARIANTS.flatMap((variant) =>
    (['loading', 'disabled'] as const).map((state) => ({
      name: `a ${state} ${variant} button`,
      still: (page: Page) => page.getByTestId(`button-${variant}-${state}`),
      live: (page: Page) => page.getByTestId(`button-${variant}-idle`),
    })),
  ),
  {
    name: 'a disabled pagination step',
    still: (page) => within(page, 'pagination').getByLabel('Previous page'),
    live: (page) => within(page, 'pagination').getByLabel('Next page'),
  },
  ...(['radio', 'link'] as const).map((kind) => ({
    name: `a disabled ${kind} segment`,
    still: (page: Page) =>
      within(page, `segments-${kind}-disabled`).locator('[data-segment]').first(),
    live: (page: Page) =>
      within(page, `segments-${kind}-enabled`).locator('[data-segment]').first(),
  })),
  {
    name: 'a loading account menu item',
    still: (page) => within(page, 'account-loading').getByRole('button'),
    live: (page) => within(page, 'account-idle').getByRole('button'),
  },
  {
    name: 'a disabled menu item',
    open: async (page) => {
      await within(page, 'dropdown').getByRole('button', { name: 'Actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Archive' })).toBeVisible();
    },
    still: (page) => page.getByRole('menuitem', { name: 'Archive' }),
    live: (page) => page.getByRole('menuitem', { name: 'Rename' }),
  },
  {
    name: 'a disabled day',
    open: async (page) => {
      await within(page, 'date').getByRole('combobox').click();
      await expect(page.getByRole('button', { name: '2027-11-03' })).toBeDisabled();
    },
    still: (page) => page.getByRole('button', { name: '2027-11-03' }),
    live: (page) => page.getByRole('button', { name: '2027-11-12' }),
  },
  {
    name: 'a disabled input',
    still: (page) => within(page, 'input-disabled').getByRole('textbox'),
    live: (page) => within(page, 'input-enabled').getByRole('textbox'),
  },
  {
    name: 'a disabled select',
    still: (page) => within(page, 'select-disabled').getByRole('combobox'),
    live: (page) => within(page, 'select-enabled').getByRole('combobox'),
  },
  {
    name: 'a disabled multiselect',
    still: (page) => within(page, 'multi-disabled').locator('[role="presentation"]'),
    live: (page) => within(page, 'multi-enabled').locator('[role="presentation"]'),
  },
  {
    name: "a disabled multiselect's remove button",
    still: (page) => within(page, 'multi-disabled').getByRole('button', { name: 'Remove Admin' }),
    live: (page) => within(page, 'multi-enabled').getByRole('button', { name: 'Remove Admin' }),
  },
  {
    name: 'a disabled time picker',
    still: (page) => within(page, 'time-disabled').getByRole('group'),
    live: (page) => within(page, 'time-enabled').getByRole('group'),
  },
  {
    name: 'a disabled file drop',
    still: (page) => within(page, 'file-disabled').locator('label.border-dashed'),
    live: (page) => within(page, 'file-enabled').locator('label.border-dashed'),
  },
  {
    // The two steppers and the number share one border, which firms as a group.
    name: 'a disabled number input',
    still: (page) => within(page, 'number-disabled').getByRole('spinbutton').locator('..'),
    live: (page) => within(page, 'number-enabled').getByRole('spinbutton').locator('..'),
    parts: 'button, input',
  },
];

const paint = (el: Locator, parts?: string) =>
  el.evaluate((node, sel) => {
    const s = getComputedStyle(node);
    const borders = sel
      ? [...node.querySelectorAll(sel)].map((part) => getComputedStyle(part).borderTopColor)
      : [];
    return `bg ${s.backgroundColor} text ${s.color} border ${s.borderTopColor} filter ${s.filter} parts ${borders.join(' ')}`;
  }, parts);

const hovered = (el: Locator) => () => el.evaluate((node) => node.matches(':hover'));

/** What the control draws with the pointer away from it, and then over it. */
async function restAndOver(page: Page, el: Locator, parts?: string) {
  await el.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await expect.poll(hovered(el), { message: 'pointer away' }).toBe(false);
  const rest = await paint(el, parts);
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(hovered(el), { message: 'pointer over' }).toBe(true);
  return { rest, over: await paint(el, parts) };
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`hover in ${theme}`, () => {
    for (const c of CASES) {
      test(`${c.name} keeps its resting color`, async ({ mount, page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mount(DisabledHoverStory);
        await c.open?.(page);
        await styleWithKit(page, theme, SOURCES);
        await page.addStyleTag({ content: '* { transition: none !important; }' });

        const live = await restAndOver(page, c.live(page), c.parts);
        expect(live.over, 'an enabled control takes its hover color').not.toBe(live.rest);

        const still = await restAndOver(page, c.still(page), c.parts);
        expect(still.over).toBe(still.rest);
      });
    }
  });
}

/*
 * The drop area marks keyboard focus on its own edge, because its input is
 * hidden. A pointer that then moves over it must not take that mark away.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`a focused file drop keeps its focus edge under the pointer in ${theme}`, async ({
    mount,
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(DisabledHoverStory);
    await styleWithKit(page, theme, SOURCES);
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    const drop = within(page, 'file-enabled').locator('label.border-dashed');
    const input = within(page, 'file-enabled').locator('input[type="file"]');
    await drop.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    const edge = () => drop.evaluate((el) => getComputedStyle(el).borderTopColor);
    const rest = await edge();
    await input.focus();
    await expect.poll(() => input.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    const focused = await edge();
    expect(focused, 'the focus edge shows').not.toBe(rest);
    const box = (await drop.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(hovered(drop), { message: 'pointer over' }).toBe(true);
    expect(await edge()).toBe(focused);
  });
}
