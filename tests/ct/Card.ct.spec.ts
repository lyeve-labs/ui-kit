/**
 * A card clipped everything inside it to its rounded corners, so a list that
 * opened from a field near its foot could not leave it: the card grew to hold
 * the list, or cut it off. A card clips only content that reaches its edge,
 * and a list from a padded card opens over what lies below it.
 */
import { test, expect } from '@playwright/experimental-ct-svelte';
import { fileURLToPath } from 'node:url';
import CardPanelStory from './CardPanelStory.svelte';
import { styleWithKit } from './kit-css.js';

const SOURCES = [
  '../../src/lib/components/Card.svelte',
  '../../src/lib/components/MultiSelect.svelte',
  '../../src/lib/internal/layout.ts',
  '../../src/lib/internal/panel.ts',
  '../../src/lib/internal/field.ts',
].map((p) => fileURLToPath(new URL(p, import.meta.url)));

test('opens a list from a padded card over what lies below it', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(CardPanelStory);
  await styleWithKit(page, 'dark', SOURCES);
  const card = page.locator('[data-print="keep"]');
  const before = await card.boundingBox();
  if (before === null) throw new Error('the card has no box');
  await page.getByRole('combobox', { name: 'Content types' }).first().click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  await list.evaluate((el) =>
    Promise.all(
      el
        .closest('[data-panel]')
        ?.getAnimations()
        .map((a) => a.finished) ?? [],
    ),
  );
  const after = await card.boundingBox();
  const panel = await list.boundingBox();
  if (after === null || panel === null) throw new Error('nothing to measure');
  expect(after.height, 'the card keeps its height').toBe(before.height);
  expect(panel.y + panel.height, 'the list runs past the card').toBeGreaterThan(
    after.y + after.height,
  );
  const shown = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('[role="listbox"]') !== null,
    [panel.x + panel.width / 2, after.y + after.height + 12],
  );
  expect(shown, 'the part below the card is drawn').toBe(true);
});
