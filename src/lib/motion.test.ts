import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TransitionConfig } from 'svelte/transition';
import {
  bezier,
  dialog,
  drawer,
  duration,
  easing,
  FALLBACK,
  popover,
  scrim,
  still,
  toast,
} from './motion.js';

const css = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');

/** A node the presets will animate: jsdom's has no `animate`. */
function animatable(): Element {
  const node = document.createElement('div');
  Object.defineProperty(node, 'animate', { value: () => ({}) });
  return node;
}

/** Resolves the deferred form a preset returns, in the direction asked for. */
function resolve(motion: ReturnType<typeof dialog>, direction: 'in' | 'out'): TransitionConfig {
  return typeof motion === 'function' ? motion({ direction }) : motion;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the fallbacks are the tokens', () => {
  // The presets read theme.css at run time and fall back to these when the
  // sheet is not loaded. A fallback that drifts from the sheet is a second
  // vocabulary that only shows up in a page that forgot the stylesheet.
  it.each(Object.entries(FALLBACK.duration))('--duration-%s is %ims', (rung, ms) => {
    expect(css).toMatch(new RegExp(`--duration-${rung}:\\s*${ms}ms;`));
  });

  it.each(Object.entries(FALLBACK.ease))('--ease-%s is cubic-bezier(%s)', (curve, points) => {
    expect(css).toMatch(
      new RegExp(`--ease-${curve}:\\s*cubic-bezier\\(${points.join(',\\s*')}\\);`),
    );
  });

  it('reads the fallback when the document declares nothing', () => {
    // jsdom loads no stylesheet, so this is the fallback path every consumer
    // hits before the theme has been parsed.
    expect(duration('slow')).toBe(320);
    expect(easing('enter')(0.25)).toBeGreaterThan(0.5);
  });

  it('reads the document over the fallback when it declares a token', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (name: string) =>
        name === '--duration-slow'
          ? '0.5s'
          : name === '--ease-enter'
            ? 'cubic-bezier(0, 0, 1, 1)'
            : '',
    } as CSSStyleDeclaration);
    expect(duration('slow')).toBe(500);
    expect(easing('enter')(0.25)).toBeCloseTo(0.25, 5);
  });
});

describe('bezier', () => {
  it('passes through the ends and follows a linear curve exactly', () => {
    const linear = bezier(0, 0, 1, 1);
    for (const x of [0, 0.1, 0.5, 0.9, 1]) expect(linear(x)).toBeCloseTo(x, 6);
  });

  it("matches the browser for CSS's ease-in-out at its midpoint", () => {
    // cubic-bezier(0.42, 0, 0.58, 1) is symmetric about the center, so y at
    // x=0.5 is exactly 0.5, which a solver that stops iterating early misses.
    expect(bezier(0.42, 0, 0.58, 1)(0.5)).toBeCloseTo(0.5, 3);
  });

  it('clamps outside the unit interval', () => {
    const f = bezier(0.22, 1, 0.36, 1);
    expect(f(-1)).toBe(0);
    expect(f(2)).toBe(1);
  });
});

describe('still', () => {
  it('is true where nothing can animate, which is every jsdom test', () => {
    expect(still(document.createElement('div'))).toBe(true);
  });

  it('is true when the reader asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(still(animatable())).toBe(true);
    vi.unstubAllGlobals();
  });

  it('is false for a node that can animate and a reader who did not ask', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(still(animatable())).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('the stylesheet honors reduced motion', () => {
  /** The body of the one reduced-motion media query, braces balanced. */
  function reducedMotionBody(): string {
    const head = css.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
    expect(head, 'no reduced-motion block in theme.css').toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', head);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
    }
    throw new Error('unbalanced reduced-motion block');
  }

  /** Each rule in the block as its selector list and its declarations. */
  function rules(): { selectors: string[]; body: string }[] {
    return [...reducedMotionBody().matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
      selectors: sel
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      body,
    }));
  }

  const VIEW_TRANSITION = [
    '::view-transition-group(*)',
    '::view-transition-image-pair(*)',
    '::view-transition-old(*)',
    '::view-transition-new(*)',
  ];

  it('states the preference in one block', () => {
    // A second block is a second place to forget a selector.
    expect(css.match(/prefers-reduced-motion/g)).toHaveLength(1);
  });

  it('shortens the view transition pseudo-elements', () => {
    // The View Transitions API animates these on the root, and `*` does not
    // match a pseudo-element, so a page cross-faded for a reader who asked for
    // less motion and a consuming app kept a script check to stop it.
    const rule = rules().find((r) => r.selectors.some((s) => s.includes('::view-transition')));
    expect(rule, 'no view transition rule in the reduced-motion block').toBeTruthy();
    expect([...rule!.selectors].sort()).toEqual([...VIEW_TRANSITION].sort());
    expect(rule!.body).toMatch(/animation-duration:\s*1ms\s*!important/);
  });

  it('keeps the view transition selectors out of the element rule', () => {
    // A browser that does not know a pseudo-element drops the whole rule it
    // appears in, and the element rule has to survive in that browser.
    const element = rules().find((r) => r.selectors.includes('*'));
    expect(element, 'no element rule in the reduced-motion block').toBeTruthy();
    expect(element!.selectors).toEqual(['*', '*::before', '*::after']);
  });
});

describe('the presets', () => {
  const run = (fn: (node: Element) => ReturnType<typeof dialog>) => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const motion = fn(animatable());
    vi.unstubAllGlobals();
    return { enter: resolve(motion, 'in'), exit: resolve(motion, 'out') };
  };

  it('play nothing where nothing can animate', () => {
    // The zero duration is what keeps every existing test green: Svelte skips
    // the animation and the element mounts and unmounts at once.
    expect(dialog(document.createElement('div'))).toEqual({ duration: 0 });
    expect(popover(document.createElement('div'))).toEqual({ duration: 0 });
  });

  it.each([
    ['dialog', dialog, 'slow', 'base'],
    ['scrim', scrim, 'slow', 'base'],
    ['popover', popover, 'base', 'fast'],
    ['toast', toast, 'base', 'fast'],
  ] as const)('%s leaves one rung faster than it enters', (_name, fn, inRung, outRung) => {
    const { enter, exit } = run(fn);
    expect(enter.duration).toBe(FALLBACK.duration[inRung]);
    expect(exit.duration).toBe(FALLBACK.duration[outRung]);
    expect(exit.duration!).toBeLessThan(enter.duration!);
  });

  it('enters on the enter curve and leaves on the exit curve', () => {
    const { enter, exit } = run(dialog);
    expect(enter.easing!(0.25)).toBeGreaterThan(0.5);
    expect(exit.easing!(0.25)).toBeLessThan(0.15);
  });

  it('draws the dialog settling to full size and full opacity', () => {
    const { enter } = run(dialog);
    expect(enter.css!(0, 1)).toBe('opacity: 0; transform: translateY(8px) scale(0.96)');
    expect(enter.css!(1, 0)).toBe('opacity: 1; transform: translateY(0px) scale(1)');
  });

  it('slides the drawer in from its own edge and never fades it', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const right = resolve(drawer(animatable(), { side: 'right' }), 'in');
    const left = resolve(drawer(animatable(), { side: 'left' }), 'in');
    vi.unstubAllGlobals();
    expect(right.css!(0, 1)).toBe('transform: translateX(100%)');
    expect(left.css!(0, 1)).toBe('transform: translateX(-100%)');
    expect(right.css!(0, 1)).not.toContain('opacity');
  });

  it('keeps the transform a leaving list item is pinned with', () => {
    // Svelte holds a leaving item in place with an inline translate before
    // its exit starts. The exit has to draw from there, not from the corner
    // of the list.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const node = animatable() as HTMLElement;
    const motion = popover(node);
    node.style.transform = 'translate(12px, -40px)';
    const exit = resolve(motion, 'out');
    vi.unstubAllGlobals();
    expect(exit.css!(0, 1)).toBe(
      'opacity: 0; transform: translate(12px, -40px) translateY(-4px) scale(0.96)',
    );
    expect(exit.css!(1, 0)).toBe(
      'opacity: 1; transform: translate(12px, -40px) translateY(0px) scale(1)',
    );
  });

  it('leaves a frame with no transform as it is', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const node = animatable() as HTMLElement;
    node.style.transform = 'translate(12px, -40px)';
    const exit = resolve(scrim(node), 'out');
    vi.unstubAllGlobals();
    expect(exit.css!(0.5, 0.5)).toBe('opacity: 0.5');
  });

  it('moves only opacity and transform', () => {
    // Anything else animates layout, which is paid for on every frame.
    for (const fn of [dialog, scrim, popover, toast]) {
      const { enter } = run(fn);
      const props = [...enter.css!(0.5, 0.5).matchAll(/([a-z-]+):/g)].map((m) => m[1]);
      expect(props.every((p) => p === 'opacity' || p === 'transform')).toBe(true);
    }
  });
});
