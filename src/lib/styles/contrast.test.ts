import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The palette is the one place a defect reaches every surface at once, and it
 * is the one place nothing was measuring. Five tokens shipped below the AA
 * floor: danger read 2.85:1 on the default ground, so every form error in the
 * library was unreadable; the light focus ring read 2.39:1, so the one
 * affordance a keyboard user has for locating themselves was the element that
 * failed; and `line` read 1.25:1 on every input border. lyeve-admin had grown a
 * block of corrections on top of the kit, which the other two apps did not
 * carry, so the same component was accessible in one app and not in another.
 *
 * These are arithmetic, not opinion. The file is parsed rather than duplicated
 * so a token can never pass here and ship a different value.
 */

const css = readFileSync(join(__dirname, 'theme.css'), 'utf8');

/** WCAG 2.2 relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Flatten `fg` at `alpha` over `bg`, which is what a /10 tint actually paints. */
function over(fg: string, bg: string, alpha: number): string {
  const mix = (i: number) =>
    Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha))
      .toString(16)
      .padStart(2, '0');
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/**
 * Tokens from one block of the stylesheet. The dark palette is everything
 * before the light block, so a value moved out of `@theme` still gets measured.
 */
function palette(scope: 'dark' | 'light'): Record<string, string> {
  const marker = css.indexOf("html[data-theme='light']");
  const region = scope === 'dark' ? css.slice(0, marker) : css.slice(marker);
  const out: Record<string, string> = {};
  for (const [, name, value] of region.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    out[name] = value.toLowerCase();
  }
  return out;
}

const dark = palette('dark');
const light = palette('light');

/** Body text sits on one of these three. A token has to clear the worst. */
const GROUNDS = ['ink', 'surface', 'surface-2'] as const;

/** Tokens used as text. Each is also painted inside a tint of itself. */
const TEXT_TOKENS = ['fg', 'muted', 'faint', 'brand', 'brand-deep', 'violet', 'success', 'warn', 'danger'];

describe.each([
  ['dark', dark],
  ['light', light],
] as const)('%s palette', (scope, tokens) => {
  it('defines every token the other palette defines', () => {
    const other = scope === 'dark' ? light : dark;
    // A colour whose only definition lives in one theme block keeps the other
    // theme's value and reads as the wrong colour there.
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(other).sort());
  });

  it.each(TEXT_TOKENS)('%s clears 4.5:1 as text on every ground', (name) => {
    const colour = tokens[name];
    expect(colour, `${name} missing from the ${scope} palette`).toBeTruthy();
    for (const ground of GROUNDS) {
      expect(ratio(colour, tokens[ground]), `${name} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['brand', 'violet', 'success', 'warn', 'danger'])(
    '%s clears 4.5:1 inside a 10 percent tint of itself',
    (name) => {
      // The bg-token/10 badge drags the background toward the text, so a value
      // that passes on the bare canvas can still fail inside its own chip.
      const colour = tokens[name];
      expect(ratio(colour, over(colour, tokens.surface, 0.1)), `${name} in its own tint`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('gives a filled button label 4.5:1 against its own field', () => {
    // Every filled variant pairs `text-ink` with a `bg-*`, and ink inverts with
    // the theme, so both roles have to hold in both palettes.
    for (const name of ['brand', 'violet', 'danger']) {
      expect(ratio(tokens.ink, tokens[name]), `ink on ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('draws the focus ring at 3:1 or better', () => {
    // SC 1.4.11. The ring is solid brand; a colour-mix down to 60 percent put
    // it at 2.39:1 on the light palette.
    for (const ground of GROUNDS) {
      expect(ratio(tokens.brand, tokens[ground]), `focus ring on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('draws an interactive border at 3:1 or better', () => {
    // SC 1.4.11 again. `line` is 1.25:1 and stays the divider colour; a control
    // whose boundary is the only thing identifying it uses line-strong.
    for (const ground of ['surface', 'surface-2'] as const) {
      expect(ratio(tokens['line-strong'], tokens[ground]), `line-strong on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('focus ring', () => {
  it('is a solid token, not a transparent mix', () => {
    const rule = css.slice(css.indexOf(':focus-visible'), css.indexOf(':focus:not('));
    expect(rule).toContain('outline: 2px solid var(--color-brand)');
    expect(rule).not.toContain('color-mix');
  });
});
