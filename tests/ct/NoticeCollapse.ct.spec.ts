/**
 * Alert and Banner in the flow of a page, in a real browser. The row a notice
 * holds opens as it arrives and closes as it leaves, so the content below
 * moves with it rather than jumping a frame after the notice has gone. A
 * RefusalNotice holds an Alert, so its row closes the same way when the page
 * drops it.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Locator } from '@playwright/experimental-ct-svelte';
import NoticeCollapseStory from './NoticeCollapseStory.svelte';
import NoticeSpacingStory from './NoticeSpacingStory.svelte';
import { styleWithKit } from './kit-css.js';
import { holdAt, pauseOnStart, pauseWhen, playing, resume, settled } from './motion.js';

const sources = ['Alert', 'Banner', 'RefusalNotice', 'Button'].map((name) =>
  fileURLToPath(new URL(`../../src/lib/components/${name}.svelte`, import.meta.url)),
);
const spacingStory = fileURLToPath(new URL('./NoticeSpacingStory.svelte', import.meta.url));

async function top(target: Locator): Promise<number> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target has no box');
  return box.y;
}

for (const kind of ['alert', 'banner', 'refusal'] as const) {
  test(`the ${kind} opens its row on the base rung and closes it one rung faster`, async ({
    mount,
    page,
  }) => {
    await mount(NoticeCollapseStory, { props: { kind } });
    await styleWithKit(page, 'dark', sources);
    const below = page.getByText('Below the notice');
    const atRest = await top(below);

    await page.getByRole('button', { name: 'Toggle' }).click();
    const flow = page.getByTestId('flow');
    const row = flow.locator('.grid').first();
    const box = row.locator('> div > div');
    await pauseWhen(flow, 2);
    expect(await playing(row)).toEqual([
      {
        duration: 200,
        properties: ['gridTemplateRows', 'overflow'],
        from: { gridTemplateRows: '0fr', overflow: 'hidden' },
      },
    ]);
    // The notice's own fade and rise play as before, on the same clock.
    expect((await playing(box)).map((a) => [a.duration, a.properties])).toEqual([
      [200, ['opacity', 'transform']],
    ]);

    // At its first frame the row holds no height, and clips the notice.
    await holdAt(flow, 0);
    expect(await top(below)).toBe(atRest);
    expect(await row.evaluate((el) => getComputedStyle(el).overflow)).toBe('hidden');
    await resume(flow);
    await settled(row);
    await settled(box);

    // At rest nothing is clipped, so a focus ring or a shadow is drawn whole.
    expect(await row.evaluate((el) => getComputedStyle(el).overflow)).toBe('visible');
    expect(await row.evaluate((el) => (el as HTMLElement).style.overflow)).toBe('');
    const opened = await top(below);
    expect(opened).toBeGreaterThan(atRest);

    // A confirmation closes itself, and a refusal leaves when the page drops it.
    await page.getByRole('button', { name: kind === 'refusal' ? 'Toggle' : 'Close' }).click();
    await pauseWhen(flow, 2);
    const [close] = await playing(row);
    expect([close.duration, close.properties]).toEqual([120, ['gridTemplateRows', 'overflow']]);
    expect((await playing(box)).map((a) => a.duration)).toEqual([120]);

    // Halfway out, the content below is on its way up, not waiting for the
    // notice to go.
    await holdAt(flow, 0.5);
    const halfway = await top(below);
    expect(halfway).toBeLessThan(opened);
    expect(halfway).toBeGreaterThan(atRest);
    await resume(flow);
    await expect(row).toHaveCount(0);
    expect(await top(below)).toBe(atRest);
  });
}

/**
 * The space a notice holds beside its neighbors moves with its row. A margin
 * of its own, the one gap a column leaves for it, and the space a space-y
 * column gives it would otherwise arrive the moment the notice mounts and go
 * the moment it unmounts, a jump of 16px at each end of the travel.
 */
for (const layout of ['margin', 'gap', 'space'] as const) {
  test(`the space a notice holds by ${layout} opens and closes with its row`, async ({
    mount,
    page,
  }) => {
    await mount(NoticeSpacingStory, { props: { layout } });
    await styleWithKit(page, 'dark', [...sources, spacingStory]);
    const below = page.getByText('Below the notice');
    const flow = page.getByTestId('flow');
    const atRest = await top(below);
    const toggle = page.getByRole('button', { name: 'Toggle' });

    await pauseOnStart(page);
    await toggle.click();
    await pauseWhen(flow, 2);
    // At the first frame the content below has not moved at all.
    await holdAt(flow, 0);
    expect(await top(below)).toBe(atRest);
    await holdAt(flow, 0.5);
    const halfway = await top(below);
    await resume(flow);
    const row = flow.locator('> .grid');
    await settled(row);
    const opened = await top(below);
    // The space travels with the row, so halfway in the content is part of
    // the way down, never short of the space.
    expect(halfway).toBeGreaterThan(atRest);
    expect(halfway).toBeLessThan(opened);

    // At rest the notice is spaced exactly as the page asked.
    const notice = await row.boundingBox();
    expect(opened - (notice!.y + notice!.height)).toBeCloseTo(16, 0);
    expect(await row.evaluate((el) => (el as HTMLElement).style.cssText)).toBe('');

    await toggle.click();
    await pauseWhen(flow, 2);
    // In the last frame of the exit the content below is already home, so the
    // notice's removal moves nothing.
    await holdAt(flow, 0.999);
    expect(Math.abs((await top(below)) - atRest)).toBeLessThan(1);
    await resume(flow);
    await expect(row).toHaveCount(0);
    expect(await top(below)).toBe(atRest);
  });
}
