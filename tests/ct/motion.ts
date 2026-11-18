/**
 * Reads the presets a surface is playing, as the browser runs them.
 *
 * Svelte plays a `motion` preset through the Web Animations API, with the
 * curve sampled into the keyframes, so what a case can hold is the length of
 * each animation, the properties its frames move and where its first frame
 * starts. jsdom has no `Element.animate` and plays every preset in no time.
 */

import { expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';

export type Played = {
  duration: number;
  properties: string[];
  from: Record<string, string>;
};

/** Every script-driven animation running on the element, longest first. */
export function playing(target: Locator): Promise<Played[]> {
  return target.evaluate((el) =>
    el
      .getAnimations()
      .filter((a) => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation))
      // Svelte holds an exit for a moment on an animation with no frames
      // before the preset starts, and that placeholder moves nothing.
      .filter((a) => (a.effect as KeyframeEffect).getKeyframes().length > 0)
      .map((a) => {
        const effect = a.effect as KeyframeEffect;
        const [first] = effect.getKeyframes();
        const own = Object.entries(first).filter(
          ([key]) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key),
        );
        return {
          duration: Number(effect.getTiming().duration),
          properties: own.map(([key]) => key).sort(),
          from: Object.fromEntries(own.map(([key, value]) => [key, String(value)])),
        };
      })
      .sort((a, b) => b.duration - a.duration),
  );
}

/**
 * Waits for the element's animations to end. An exit that starts while the
 * entrance is still running plays only the share the entrance had covered.
 */
export async function settled(target: Locator): Promise<void> {
  await target.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

/**
 * Pauses every preset the moment it starts, from here on. Call it before the
 * change that starts the presets, and then `pauseWhen` only counts them.
 *
 * A poll after the change reads the page some time later, and under load a
 * 120ms or 200ms preset can end before the first read. Svelte starts a preset
 * with `Element.animate`, which fires no event a listener could catch, so the
 * method itself is wrapped. Svelte first plays a placeholder for the length of
 * the delay, which is no time here, and starts the preset when it ends, so
 * only an animation that lasts is paused.
 */
export function pauseOnStart(page: Page): Promise<void> {
  return page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (
      this: Element,
      ...args: Parameters<Element['animate']>
    ): Animation {
      const animation = animate.apply(this, args);
      if (Number(animation.effect?.getTiming().duration) > 0) animation.pause();
      return animation;
    };
  });
}

/**
 * Pauses every preset playing inside the element once `count` have started,
 * so a loaded run cannot let one end before the case has read it. Without
 * `pauseOnStart` installed first, a short preset can end before the poll.
 */
export async function pauseWhen(target: Locator, count: number): Promise<void> {
  await expect
    .poll(() =>
      target.evaluate((el, want) => {
        const presets = el
          .getAnimations({ subtree: true })
          .filter((a) => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation))
          .filter((a) => (a.effect as KeyframeEffect).getKeyframes().length > 0);
        if (presets.length < want) return presets.length;
        presets.forEach((a) => a.pause());
        return presets.length;
      }, count),
    )
    .toBe(count);
}

/** Moves every paused animation inside the element to a share of its length. */
export function holdAt(target: Locator, share: number): Promise<void> {
  return target.evaluate((el, at) => {
    for (const a of el.getAnimations({ subtree: true })) {
      a.currentTime = Number(a.effect!.getTiming().duration) * at;
    }
  }, share);
}

export function resume(target: Locator): Promise<void> {
  return target.evaluate((el) => el.getAnimations({ subtree: true }).forEach((a) => a.play()));
}
