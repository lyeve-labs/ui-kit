import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { compile } from 'tailwindcss';
import { contrast } from './utils/palette.js';

/**
 * The selection pair is for an outline over content the app does not own,
 * so its promise is that one of its two lines reads on any background, in any
 * theme. Every other color flips with data-theme, and a pair that flipped too
 * would land back where the brand ring failed.
 */

const themePath = join(__dirname, 'styles/theme.css');
const source = readFileSync(themePath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function declared(name: string): string {
  const m = new RegExp(`--color-selection-${name}:\\s*(#[0-9a-f]{6})\\s*;`, 'i').exec(source);
  expect(m, `--color-selection-${name} is not declared`).toBeTruthy();
  return m![1].toLowerCase();
}

const dark = declared('dark');
const light = declared('light');

/** A channel step of 17 visits every color of the #rgb shorthand, black and white included. */
function* backgrounds(): Generator<string> {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  for (let r = 0; r <= 255; r += 17)
    for (let g = 0; g <= 255; g += 17)
      for (let b = 0; b <= 255; b += 17) yield `#${hex(r)}${hex(g)}${hex(b)}`;
}

describe('the selection pair', () => {
  it('reads 9:1 or more between its two lines, so one clears 3:1 on any background', () => {
    // On a background between the two, the two ratios multiply to the pair's
    // own, so the larger is at least its square root. Past either end the far
    // line reads at the pair's ratio or more.
    expect(contrast(dark, light)).toBeGreaterThanOrEqual(9);
    expect(Math.sqrt(contrast(dark, light))).toBeGreaterThan(4.29);
  });

  it('puts one line at 3:1 or more on each of 4,096 backgrounds', () => {
    let worst = Infinity;
    for (const bg of backgrounds()) {
      worst = Math.min(worst, Math.max(contrast(bg, dark), contrast(bg, light)));
    }
    expect(worst).toBeGreaterThanOrEqual(3);
  });

  it('is declared once, in a static theme block, and in no theme or scheme rule', () => {
    for (const name of ['dark', 'light']) {
      expect(source.match(new RegExp(`--color-selection-${name}:`, 'g'))).toHaveLength(1);
    }
    expect(source).toMatch(
      /@theme static \{\s*--color-selection-dark:[^;]+;\s*--color-selection-light:[^;]+;\s*\}/,
    );
  });
});

describe('the selection pair, in the compiled stylesheet', () => {
  afterEach(() => {
    document.head.querySelector('style[data-selection-pair]')?.remove();
    document.documentElement.removeAttribute('data-theme');
    document.body.replaceChildren();
  });

  /** The stylesheet as Tailwind compiles it for an app, with no class of the app's own. */
  async function compiled(): Promise<string> {
    const compiler = await compile(readFileSync(themePath, 'utf8'), {
      base: dirname(themePath),
      loadStylesheet: async (id, base) => {
        const path =
          id === 'tailwindcss' ? resolve('node_modules/tailwindcss/index.css') : resolve(base, id);
        return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
      },
    });
    return compiler.build([]);
  }

  async function read(): Promise<(el: Element, token: string) => string> {
    const style = document.createElement('style');
    style.dataset.selectionPair = '';
    style.textContent = await compiled();
    document.head.append(style);
    return (el, token) => getComputedStyle(el).getPropertyValue(`--color-${token}`).trim();
  }

  it('keeps both colors under every theme and scheme, where the brand changes', async () => {
    const value = await read();
    const part = document.body.appendChild(document.createElement('div'));
    const seen: Record<string, Set<string>> = {
      brand: new Set(),
      dark: new Set(),
      light: new Set(),
    };
    const look = (el: Element) => {
      seen.brand.add(value(el, 'brand').toLowerCase());
      seen.dark.add(value(el, 'selection-dark').toLowerCase());
      seen.light.add(value(el, 'selection-light').toLowerCase());
    };
    for (const theme of [null, 'dark', 'light', 'system']) {
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      look(document.documentElement);
      for (const scheme of ['dark', 'light']) {
        part.setAttribute('data-scheme', scheme);
        look(part);
      }
      part.removeAttribute('data-scheme');
    }
    // The brand flipping proves the harness reaches the theme rules at all.
    expect(seen.brand.size).toBeGreaterThan(1);
    expect([...seen.dark]).toEqual([dark]);
    expect([...seen.light]).toEqual([light]);
  }, 30_000);
});
