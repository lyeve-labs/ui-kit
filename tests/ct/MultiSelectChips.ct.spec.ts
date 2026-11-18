/**
 * The chips of a MultiSelect in a real browser. A chosen value's chip fades in
 * where it lands and out where it stood, and the chips after a removed one
 * close the gap on the move curve, as the rows of a SortableList do.
 */

import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/experimental-ct-svelte';
import MultiSelect from '../../src/lib/components/MultiSelect.svelte';
import { styleWithKit } from './kit-css.js';
import { pauseOnStart, pauseWhen, playing, resume } from './motion.js';

const sources = [
  fileURLToPath(new URL('../../src/lib/components/MultiSelect.svelte', import.meta.url)),
];

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

test('a chip fades out where it stood and the chips after it close the gap', async ({
  mount,
  page,
}) => {
  await mount(MultiSelect, {
    props: { label: 'Tags', options, value: ['a', 'b', 'c'] },
  });
  await styleWithKit(page, 'dark', sources);
  const chip = (name: string) => page.getByLabel(`Remove ${name}`).locator('..');
  const field = page.locator('body');

  await pauseOnStart(page);
  await page.getByLabel('Remove Alpha').click();
  await pauseWhen(field, 3);
  expect((await playing(chip('Alpha'))).map((a) => [a.duration, a.properties])).toEqual([
    [120, ['opacity']],
  ]);
  for (const name of ['Beta', 'Gamma']) {
    const [move] = await playing(chip(name));
    expect([move.duration, move.properties]).toEqual([200, ['transform']]);
  }
  await resume(field);
  await expect(page.getByLabel('Remove Alpha')).toHaveCount(0);
});

test('a chosen value arrives as a chip that fades in on the base rung', async ({ mount, page }) => {
  await mount(MultiSelect, {
    props: { label: 'Tags', options, value: ['b'] },
  });
  await styleWithKit(page, 'dark', sources);
  const field = page.locator('body');
  await page.getByRole('combobox', { name: 'Tags' }).click();
  await pauseOnStart(page);
  await page.getByRole('option', { name: 'Alpha' }).click();
  const chip = page.getByLabel('Remove Alpha').locator('..');
  await expect(chip).toHaveCount(1);
  await pauseWhen(chip, 1);
  const [enter] = await playing(chip);
  expect([enter.duration, enter.properties, enter.from.opacity]).toEqual([200, ['opacity'], '0']);
  await resume(field);
});
