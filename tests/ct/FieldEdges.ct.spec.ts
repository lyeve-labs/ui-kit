/**
 * Every field rests on the soft line and firms to line-strong under the
 * pointer, and focus keeps its own border. Tailwind emits focus-within and
 * has- variants before hover, so a frame focused through a part inside it is
 * the case a class check cannot prove: only the compiled sheet says which
 * rule wins.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Locator } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import FieldEdgesStory from './FieldEdgesStory.svelte';
import FocusEdgesStory from './FocusEdgesStory.svelte';
import { styleWithKit } from './kit-css.js';

// The panel's search box is drawn only once a list opens, so its classes come
// from the source rather than from the page.
const PANEL = fileURLToPath(new URL('../../src/lib/internal/panel.ts', import.meta.url));

const LINE = 'rgb(25, 42, 61)';
const LINE_STRONG = 'rgb(97, 109, 128)';
const FOCUS = 'rgb(0, 153, 196)';
const DANGER = 'rgb(248, 113, 113)';

const top = (el: Element) => getComputedStyle(el).borderTopColor;

test('a field rests soft, firms under the pointer and keeps its focus border', async ({
  mount,
  page,
}) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const name = page.getByLabel('Name');
  await expect.poll(() => name.evaluate(top)).toBe(LINE);
  await name.hover();
  await expect.poll(() => name.evaluate(top)).toBe(LINE_STRONG);
  await name.focus();
  await expect.poll(() => name.evaluate(top)).toBe(FOCUS);
});

type Edge = { color: string; width: string; ring: boolean; outline: string };

// The edge a focused field draws, read from the field or from the frame that
// draws the border for a part inside it. A ring is a box shadow with no blur
// and a spread. The well's inner shadow has a blur and no spread.
const edgeOf = (el: Element, frame: boolean): Edge => {
  const box = frame ? el.closest('[role="presentation"], .rounded-lg.border')! : el;
  const s = getComputedStyle(box);
  return {
    color: s.borderTopColor,
    width: s.borderTopWidth,
    ring: / 0px 0px 0px [1-9]/.test(` ${s.boxShadow}`),
    outline: getComputedStyle(el).outlineStyle,
  };
};

test('every text field shows focus by its 1px border alone', async ({ mount, page }) => {
  // A second pixel inside the border made a focused search box read heavier
  // than the select beside it and the highlighted option in its list. Every
  // field a person types into or opens now turns its border the focus color
  // at the border's own 1px, with no ring or outline inside or outside it.
  await mount(FocusEdgesStory);
  await styleWithKit(page, 'dark', [PANEL]);

  const fields: [string, Locator, boolean][] = [
    ['Name', page.getByLabel('Name', { exact: true }), false],
    ['Notes', page.getByLabel('Notes', { exact: true }), false],
    ['Password', page.getByLabel('Password', { exact: true }), false],
    ['Search posts', page.getByLabel('Search posts', { exact: true }), false],
    ['Hours', page.getByLabel('Hours', { exact: true }), false],
    ['Sort', page.getByRole('combobox', { name: 'Sort' }), false],
    ['Country', page.getByLabel('Country', { exact: true }), false],
    ['Starts on', page.getByRole('combobox', { name: 'Starts on' }), false],
    ['Accent', page.getByLabel('Accent', { exact: true }), false],
    ['Tags', page.getByRole('combobox', { name: 'Tags' }), true],
    ['Key', page.getByLabel('Key', { exact: true }), true],
  ];
  const drawn: Record<string, Edge> = {};
  for (const [name, field, frame] of fields) {
    await field.focus();
    await expect.poll(() => field.evaluate(edgeOf, frame).then((e) => e.color), name).toBe(FOCUS);
    drawn[name] = await field.evaluate(edgeOf, frame);
  }

  // The search box at the top of a list takes focus when the list opens.
  await page.getByRole('combobox', { name: 'Sort' }).press('Enter');
  const search = page.locator('input:focus');
  await expect(search).toHaveCount(1);
  await expect.poll(() => search.evaluate(edgeOf, false).then((e) => e.color)).toBe(FOCUS);
  drawn['Sort search'] = await search.evaluate(edgeOf, false);

  const one: Edge = { color: FOCUS, width: '1px', ring: false, outline: 'none' };
  expect(drawn).toEqual(Object.fromEntries(Object.keys(drawn).map((name) => [name, one])));
  expect(Object.keys(drawn)).toHaveLength(12);
});

test('a field in error keeps its red edge while it has focus', async ({ mount, page }) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const email = page.getByLabel('Email');
  await expect.poll(() => email.evaluate(top)).toBe(DANGER);
  await email.focus();
  await expect.poll(() => email.evaluate(top)).toBe(DANGER);
  const shadow = await email.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toContain(`${DANGER} 0px 0px 0px 1px inset`);
  expect(shadow).not.toContain(FOCUS);
});

test('the number field and its steppers firm together', async ({ mount, page }) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const hours = page.getByLabel('Hours', { exact: true });
  const decrease = page.getByRole('button', { name: /^Decrease/ });
  await expect.poll(() => decrease.evaluate(top)).toBe(LINE);
  await decrease.hover();
  await expect.poll(() => hours.evaluate(top)).toBe(LINE_STRONG);
  await expect.poll(() => decrease.evaluate(top)).toBe(LINE_STRONG);
});

test('a frame focused through its segment keeps the focus border under the pointer', async ({
  mount,
  page,
}) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const frame = page.getByRole('group', { name: 'Starts' });
  await expect.poll(() => frame.evaluate(top)).toBe(LINE);
  await frame.hover();
  await expect.poll(() => frame.evaluate(top)).toBe(LINE_STRONG);
  await frame.getByRole('spinbutton').first().focus();
  await frame.hover();
  await expect.poll(() => frame.evaluate(top)).toBe(FOCUS);
});

test('the chosen segment is a tinted fill with no edge', async ({ mount, page }) => {
  await mount(FieldEdgesStory);
  await styleWithKit(page, 'dark');

  const track = page.getByRole('radiogroup', { name: 'View' });
  await expect.poll(() => track.evaluate(top)).toBe(LINE);
  const chosen = page.getByRole('radio', { name: 'List' });
  // The segment eases its colors, so read them once the transition settles.
  await expect
    .poll(() => chosen.evaluate((el) => getComputedStyle(el).color))
    .toBe('rgb(0, 212, 255)');
  const paint = await chosen.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fill: s.backgroundColor, shadow: s.boxShadow };
  });
  expect(paint.shadow).toBe('none');
  expect(paint.fill).not.toBe('rgba(0, 0, 0, 0)');
});
