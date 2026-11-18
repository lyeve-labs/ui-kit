/**
 * A loading Button in a real browser. The spinner arrives over the label and
 * the label fades where it stands, so the button keeps its width and height
 * and nothing beside it moves.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Locator } from '@playwright/experimental-ct-svelte';
import ButtonSpinnerStory from './ButtonSpinnerStory.svelte';
import ButtonSpreadStory from './ButtonSpreadStory.svelte';
import { styleWithKit } from './kit-css.js';
import { pauseOnStart, pauseWhen, playing, resume, settled } from './motion.js';

const sources = ['Button', 'Spinner'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);

async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target has no box');
  return box;
}

for (const [role, name] of [
  ['button', 'Save changes'],
  ['link', 'Continue'],
] as const) {
  test(`${name}: the spinner fades in over the label and the button keeps its size`, async ({
    mount,
    page,
  }) => {
    await mount(ButtonSpinnerStory);
    await styleWithKit(page, 'dark', sources);
    const control = page.getByRole(role, { name });
    const label = control.getByText(name);
    const spin = control.locator('svg.animate-spin');
    await expect(spin).toHaveCount(0);
    const atRest = await boxOf(control);
    const labelAtRest = await boxOf(label);

    // The label fades on the fast rung, as a state change in place.
    const fades = await label.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.transitionProperty, style.transitionDuration];
    });
    expect(fades).toEqual(['opacity', '0.12s']);

    await pauseOnStart(page);
    await page.getByRole('button', { name: 'Toggle' }).click();
    const cell = spin.locator('..');
    await expect(spin).toHaveCount(1);
    expect(await boxOf(control)).toEqual(atRest);
    expect(await boxOf(label)).toEqual(labelAtRest);
    await pauseWhen(cell, 1);
    expect((await playing(cell)).map((a) => [a.duration, a.properties])).toEqual([
      [200, ['opacity']],
    ]);
    await resume(cell);
    await settled(cell);
    await expect(label).toHaveCSS('opacity', '0');

    // The spinner sits on the label's center.
    const s = await boxOf(spin);
    expect(Math.abs(s.x + s.width / 2 - (labelAtRest.x + labelAtRest.width / 2))).toBeLessThan(1);
    expect(Math.abs(s.y + s.height / 2 - (labelAtRest.y + labelAtRest.height / 2))).toBeLessThan(1);

    // The name and the busy state read as before.
    await expect(control).toHaveAttribute('aria-busy', 'true');
    await expect(control).toHaveAccessibleName(name);

    await page.getByRole('button', { name: 'Toggle' }).click();
    await pauseWhen(cell, 1);
    expect((await playing(cell)).map((a) => a.duration)).toEqual([120]);
    await resume(cell);
    await expect(spin).toHaveCount(0);
    await expect(label).toHaveCSS('opacity', '1');
    expect(await boxOf(control)).toEqual(atRest);
  });
}

test('a wider button centers its label and a spacer reaches its far edge, at rest and while loading', async ({
  mount,
  page,
}) => {
  await mount(ButtonSpreadStory);
  await styleWithKit(page, 'dark', sources);
  const wide = page.getByRole('button', { name: 'Publish' });
  const words = wide.getByText('Publish');
  const row = page.getByRole('button', { name: 'id uuid' });
  const note = row.getByText('uuid');

  const contentEdge = () =>
    row.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    });
  const center = async (target: Locator) => {
    const box = await boxOf(target);
    return box.x + box.width / 2;
  };
  const check = async () => {
    const box = await boxOf(note);
    expect(Math.abs(box.x + box.width - (await contentEdge()))).toBeLessThan(1);
    expect(Math.abs((await center(words)) - (await center(wide)))).toBeLessThan(1);
  };

  await check();
  await page.getByRole('button', { name: 'Toggle' }).click();
  await expect(row.locator('svg.animate-spin')).toHaveCount(1);
  await check();
});
