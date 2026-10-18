/**
 * Axe over each part in both themes, with the kit's own stylesheet on the page
 * so color contrast is measured on the colors a reader sees. A serious or
 * critical finding fails the case.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/experimental-ct-svelte';
import NoticeStory from './NoticeStory.svelte';
import SplitPaneStory from './SplitPaneStory.svelte';
import { styleWithKit } from './kit-css.js';

const INK = { dark: 'rgb(11, 20, 34)', light: 'rgb(246, 247, 249)' };

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
  });
}
