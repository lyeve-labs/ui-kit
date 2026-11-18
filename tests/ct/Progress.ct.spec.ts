/**
 * An indeterminate Progress in a real browser. A segment sweeps across the
 * track on a loop of its own period, moving transform alone. Under reduced
 * motion the loop plays once in 1ms and stops, and the segment rests centered
 * on the track, which still reads as busy and never as a value.
 */

import { fileURLToPath } from 'node:url';
import { test, expect, type Locator } from '@playwright/experimental-ct-svelte';
import Progress from '../../src/lib/components/Progress.svelte';
import { styleWithKit } from './kit-css.js';

const sources = [
  fileURLToPath(new URL('../../src/lib/components/Progress.svelte', import.meta.url)),
];

/** The CSS animations on the element, as the browser runs them. */
function loops(target: Locator) {
  return target.evaluate((el) =>
    el
      .getAnimations()
      .filter((a) => a instanceof CSSAnimation)
      .map((a) => {
        const effect = a.effect as KeyframeEffect;
        const timing = effect.getComputedTiming();
        const moved = new Set(
          effect
            .getKeyframes()
            .flatMap((frame) =>
              Object.keys(frame).filter(
                (key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key),
              ),
            ),
        );
        return {
          name: (a as CSSAnimation).animationName,
          duration: Number(timing.duration),
          iterations: timing.iterations,
          moves: [...moved].sort(),
        };
      }),
  );
}

async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target has no box');
  return box;
}

test('sweeps a segment across the track on its own loop', async ({ mount, page }) => {
  const component = await mount(Progress, { props: { indeterminate: true, label: 'Loading' } });
  await styleWithKit(page, 'dark', sources);
  const track = component.getByRole('progressbar', { name: 'Loading' });
  await expect(track).not.toHaveAttribute('aria-valuenow');
  const bar = track.locator('> div');
  const [loop] = await loops(bar);
  expect(loop.name).toBe('progress-sweep');
  expect(loop.iterations).toBe(Infinity);
  expect(loop.duration).toBeGreaterThan(0);
  expect(loop.moves).toEqual(['transform']);
});

test('rests as a still segment centered on the track under reduced motion', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(Progress, { props: { indeterminate: true, label: 'Loading' } });
  await styleWithKit(page, 'dark', sources);
  const track = component.getByRole('progressbar', { name: 'Loading' });
  const bar = track.locator('> div');
  await expect.poll(() => loops(bar)).toEqual([]);

  // The browser draws the resting style once the one short iteration ends.
  await expect(bar).toHaveCSS('transform', 'none');
  await expect(bar).toHaveCSS('opacity', '1');
  const t = await boxOf(track);
  const b = await boxOf(bar);
  expect(b.height).toBe(t.height);
  expect(b.width).toBeCloseTo(t.width * 0.4, 0);
  expect(b.x + b.width / 2).toBeCloseTo(t.x + t.width / 2, 0);
});
