/**
 * Tracks which edges of a horizontal scroll box have content behind them, for
 * the fades Table and Tabs draw with ScrollFades.
 */
import { scrollEdges } from './scroll-edges.js';

export interface ScrollFades {
  readonly before: boolean;
  readonly after: boolean;
  /**
   * `use:` on the scroll box. Measures on mount, on every scroll and whenever
   * the box or its content changes size: a column added, a filter applied, a
   * sidebar collapsed. Both boxes are watched because either one moving
   * changes whether the other overflows.
   */
  track(node: HTMLElement): { destroy(): void };
}

export function createScrollFades(): ScrollFades {
  let before = $state(false);
  let after = $state(false);

  function track(node: HTMLElement): { destroy(): void } {
    const measure = () => {
      const edges = scrollEdges(node);
      before = edges.before;
      after = edges.after;
    };
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(node);
      if (node.firstElementChild) observer.observe(node.firstElementChild);
    }
    return {
      destroy() {
        node.removeEventListener('scroll', measure);
        observer?.disconnect();
      },
    };
  }

  return {
    get before() {
      return before;
    },
    get after() {
      return after;
    },
    track,
  };
}
