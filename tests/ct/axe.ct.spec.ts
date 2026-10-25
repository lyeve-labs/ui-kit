/**
 * Axe over each part in both themes, with the kit's own stylesheet on the page
 * so color contrast is measured on the colors a reader sees. A serious or
 * critical finding fails the case.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import ColorField from '../../src/lib/components/ColorField.svelte';
import DiffView from '../../src/lib/components/DiffView.svelte';
import LowContrastStory from './LowContrastStory.svelte';
import NoticeStory from './NoticeStory.svelte';
import SortableListStory from './SortableListStory.svelte';
import SplitPaneStory from './SplitPaneStory.svelte';
import { styleWithKit } from './kit-css.js';

const INK = { dark: 'rgb(11, 20, 34)', light: 'rgb(246, 247, 249)' };

const THEME = [
  { value: 'brand', label: 'Brand', color: '#2F6FEB' },
  { value: 'accent', label: 'Accent', color: '#F59E0B' },
  { value: 'surface', label: 'Surface', color: '#FFFFFF' },
];

const CHANGES = [
  { kind: 'added', label: 'Subtitle', value: 'Light shoes for long days.' },
  { kind: 'removed', label: 'Banner', value: 'Spring sale' },
  { kind: 'changed', label: 'Title', before: 'Run far', after: '' },
  { kind: 'moved', label: 'Pricing', value: 'From position 2 to 4' },
  { kind: 'added', label: 'Body', value: 'Long enough to fold. '.repeat(30) },
];

async function blocking(page: Page) {
  const { violations } = await new AxeBuilder({ page }).include('#root').analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`axe, ${theme}`, () => {
    // The page has to carry the theme before contrast means anything.
    async function styled(page: Page) {
      await styleWithKit(page, theme);
      await expect(page.locator('body')).toHaveCSS('background-color', INK[theme]);
    }

    // The control: a run that finds nothing here measured unstyled markup,
    // and every clean case below would mean nothing.
    test('reports a planted low-contrast line as serious', async ({ mount, page }) => {
      await mount(LowContrastStory);
      await styled(page);
      expect(await blocking(page)).toEqual(['color-contrast: p']);
    });

    test('SplitPane, expanded', async ({ mount, page }) => {
      await mount(SplitPaneStory, { props: { collapsible: true } });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('SplitPane, locked', async ({ mount, page }) => {
      await mount(SplitPaneStory, { props: { seed: { width: 300, locked: true } } });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('SplitPane, collapsed', async ({ mount, page }) => {
      const pane = await mount(SplitPaneStory, { props: { collapsible: true } });
      await pane.getByRole('button', { name: 'Collapse Layers' }).click();
      await expect(pane.getByRole('button', { name: 'Expand Layers' })).toBeVisible();
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('RefusalNotice', async ({ mount, page }) => {
      await mount(NoticeStory, { props: { part: 'refusal' } });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('GateNotice, every state', async ({ mount, page }) => {
      const story = await mount(NoticeStory, { props: { part: 'gate' } });
      await expect(story.getByTestId('gate-notice')).toHaveCount(7);
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('SortableList', async ({ mount, page }) => {
      await mount(SortableListStory, { props: { fields: true } });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test("SortableList, a handle's menu open", async ({ mount, page }) => {
      const story = await mount(SortableListStory, { props: {} });
      await story.getByRole('button', { name: 'Move Pricing' }).click();
      await expect(story.getByRole('menu')).toBeVisible();
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('ColorField, typed, with a refusal', async ({ mount, page }) => {
      await mount(ColorField, {
        props: { label: 'Brand', value: '#2F6FEB', error: 'This color is taken.' },
      });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('ColorField, from swatches', async ({ mount, page }) => {
      await mount(ColorField, {
        props: { label: 'Background', swatches: THEME, value: 'accent', hint: 'Pick a color.' },
      });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('ColorField, a stored color the theme lost', async ({ mount, page }) => {
      await mount(ColorField, {
        props: { label: 'Background', swatches: THEME, value: 'brand-old' },
      });
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });

    test('DiffView, every kind of change', async ({ mount, page }) => {
      const view = await mount(DiffView, { props: { changes: CHANGES } });
      await expect(view.getByRole('button', { name: 'Show all' })).toBeVisible();
      await styled(page);
      expect(await blocking(page)).toEqual([]);
    });
  });
}
