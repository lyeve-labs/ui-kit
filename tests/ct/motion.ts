/**
 * Reads the presets a surface is playing, as the browser runs them.
 *
 * Svelte plays a `motion` preset through the Web Animations API, with the
 * curve sampled into the keyframes, so what a case can hold is the length of
 * each animation, the properties its frames move and where its first frame
 * starts. jsdom has no `Element.animate` and plays every preset in no time.
 */

import type { Locator } from '@playwright/experimental-ct-svelte';

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
