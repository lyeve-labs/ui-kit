/**
 * The entrances and exits, as Svelte transitions that read the motion tokens.
 *
 *     <div in:motion.dialog out:motion.dialog>
 *     <div transition:motion.popover>
 *     <li animate:motion.reorder>
 *
 * A CSS animation plays an entrance and nothing else: the element it ran on
 * is gone the moment `{#if}` turns false, so a dialog that eased open snapped
 * shut. A Svelte transition keeps the element until the exit has played, and
 * the same function serves both directions, so an entrance and its exit are
 * written once and cannot drift apart.
 *
 * Every preset takes its duration and curve from `theme.css` at the moment it
 * runs, so a consumer that retunes a token retunes these too. The numbers
 * below are the fallback for a document that has not loaded the stylesheet,
 * and a test holds them equal to the tokens.
 *
 * Two cases return no duration at all. A reader who asked for reduced motion
 * gets the state change and none of the travel; the reduced-motion block in
 * theme.css cannot reach these, because Svelte drives them through the Web
 * Animations API and not through a stylesheet. And a document with no
 * `Element.animate`, which is every jsdom test, mounts and unmounts at once,
 * exactly as it did before the exits existed.
 *
 * This is the one module that may import `svelte/animate`, `svelte/easing`
 * or `svelte/transition`. A component that reaches for them directly has
 * chosen its own numbers, which is the thing the tokens exist to end.
 */
import { flip } from 'svelte/animate';
import type { AnimationConfig } from 'svelte/animate';
import type { TransitionConfig } from 'svelte/transition';

export type Rung = 'fast' | 'base' | 'slow' | 'progress';
export type Curve = 'enter' | 'exit' | 'move';

/** What `theme.css` declares, for a document that has not loaded it. */
export const FALLBACK = {
  duration: { fast: 120, base: 200, slow: 320, progress: 500 } satisfies Record<Rung, number>,
  ease: {
    enter: [0.22, 1, 0.36, 1],
    exit: [0.32, 0, 0.67, 0],
    move: [0.65, 0, 0.35, 1],
  } satisfies Record<Curve, number[]>,
} as const;

/** How the two directions of one surface relate: one rung faster on the way out. */
const EXIT_RUNG: Record<Rung, Rung> = {
  fast: 'fast',
  base: 'fast',
  slow: 'base',
  progress: 'base',
};

/**
 * What a preset hands Svelte. The function form is resolved once the element
 * is in the DOM, with the direction the animation is really playing in; under
 * `transition:` the directive itself only ever says `both`, so this is the
 * one way a single directive can tune its exit apart from its entrance.
 */
export type Motion = TransitionConfig | ((opts?: { direction: 'in' | 'out' }) => TransitionConfig);

function token(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A `--duration-*` token in milliseconds, or its fallback. */
export function duration(rung: Rung): number {
  const m = /^(\d*\.?\d+)(ms|s)$/.exec(token(`--duration-${rung}`));
  if (!m) return FALLBACK.duration[rung];
  return m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]);
}

/**
 * A cubic bezier as the function Svelte samples, from its four control
 * points. Solves x for t by Newton's method with a bisection fallback, the
 * same shape WebKit's UnitBezier takes, so the curve a transition follows is
 * the curve the stylesheet names.
 */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solve = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= dx / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const s = sampleX(t);
      if (Math.abs(s - x) < 1e-6) return t;
      if (x > s) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solve(x)));
}

const curves = new Map<string, (x: number) => number>();

/** An `--ease-*` token as a function, or its fallback. */
export function easing(curve: Curve): (x: number) => number {
  const raw = token(`--ease-${curve}`);
  const m = /^cubic-bezier\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/.exec(raw);
  const points = m ? m.slice(1, 5).map(Number) : FALLBACK.ease[curve];
  const key = points.join(',');
  let fn = curves.get(key);
  if (!fn) {
    fn = bezier(points[0], points[1], points[2], points[3]);
    curves.set(key, fn);
  }
  return fn;
}

/** True when the document asked for no motion, or cannot play any. */
export function still(node: Element): boolean {
  if (typeof node.animate !== 'function') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * One transition from the rung its entrance runs at and the frame it draws.
 * The exit is derived, never chosen: one rung faster, on the exit curve.
 */
function surface(rung: Rung, css: (t: number, u: number) => string) {
  return (node: Element): Motion => {
    if (still(node)) return { duration: 0 };
    return ({ direction } = { direction: 'in' }) => {
      const leaving = direction === 'out';
      return {
        duration: duration(leaving ? EXIT_RUNG[rung] : rung),
        easing: easing(leaving ? 'exit' : 'enter'),
        css,
      };
    };
  };
}

/** A centred dialog: rises a little and settles to full size. */
export const dialog = surface(
  'slow',
  (t, u) => `opacity: ${t}; transform: translateY(${8 * u}px) scale(${0.96 + 0.04 * t})`,
);

/** The scrim behind a dialog or drawer, on the same clock as its surface. */
export const scrim = surface('slow', (t) => `opacity: ${t}`);

/**
 * A panel docked to a viewport edge: the whole panel slides in from its own
 * edge. No fade, since a surface arriving from off screen is never half there.
 */
export function drawer(node: Element, params: { side?: 'left' | 'right' } = {}): Motion {
  const sign = params.side === 'left' ? -1 : 1;
  return surface('slow', (_t, u) => `transform: translateX(${sign * 100 * u}%)`)(node);
}

/** A menu, listbox, tooltip or date grid anchored to its trigger. */
export const popover = surface(
  'base',
  (t, u) => `opacity: ${t}; transform: translateY(${-4 * u}px) scale(${0.96 + 0.04 * t})`,
);

/** One toast arriving in the stack, and leaving it. */
export const toast = surface(
  'base',
  (t, u) => `opacity: ${t}; transform: translateY(${8 * u}px) scale(${0.96 + 0.04 * t})`,
);

/**
 * Siblings closing the gap a removed item leaves, for `animate:`. Svelte's
 * flip measures the move; the kit supplies the clock.
 */
export function reorder(
  node: Element,
  positions: { from: DOMRect; to: DOMRect },
  _params?: unknown,
): AnimationConfig {
  if (still(node)) return { duration: 0 };
  return flip(node, positions, { duration: duration('base'), easing: easing('move') });
}
