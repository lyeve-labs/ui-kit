import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The palette is the one place a defect reaches every surface at once, and it
 * is the one place nothing was measuring. Five tokens shipped below the AA
 * floor: danger read 2.85:1 on the default ground, so every form error in the
 * library was unreadable. The light focus ring read 2.39:1, so the one
 * affordance a keyboard user has for locating themselves was the element that
 * failed, and `line` read 1.25:1 on every input border. lyeve-admin had grown a
 * block of corrections on top of the kit, which the other two apps did not
 * carry, so the same component was accessible in one app and not in another.
 *
 * These are arithmetic, not opinion. The file is parsed rather than duplicated
 * so a token can never pass here and ship a different value.
 *
 * Lives beside the other library-wide suites rather than inside styles/, which
 * is a published directory: `files` ships src/lib/styles wholesale for the
 * styles.css export, and its test exclusions only cover dist.
 */

const css = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');

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
    Math.round(
      parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha),
    )
      .toString(16)
      .padStart(2, '0');
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/**
 * Tokens from one block of the stylesheet. The dark palette is everything
 * before the light block, so a value moved out of `@theme` still gets measured.
 * The light palette is that block alone. Read to the end of the file, the
 * print block's black on white overwrote every light value, so each light
 * case measured the paper palette and passed whatever the screen showed.
 */
function palette(scope: 'dark' | 'light'): Record<string, string> {
  const marker = css.indexOf("html[data-theme='light'] {");
  const region =
    scope === 'dark' ? css.slice(0, marker) : css.slice(marker, css.indexOf('}', marker));
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
const TEXT_TOKENS = [
  'fg',
  'muted',
  'faint',
  'brand',
  'brand-deep',
  'violet',
  'success',
  'warn',
  'danger',
];

describe.each([
  ['dark', dark],
  ['light', light],
] as const)('%s palette', (scope, tokens) => {
  it('defines every token the other palette defines', () => {
    const other = scope === 'dark' ? light : dark;
    // A color whose only definition lives in one theme block keeps the other
    // theme's value and reads as the wrong color there.
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(other).sort());
  });

  it.each(TEXT_TOKENS)('%s clears 4.5:1 as text on every ground', (name) => {
    const color = tokens[name];
    expect(color, `${name} missing from the ${scope} palette`).toBeTruthy();
    for (const ground of GROUNDS) {
      expect(ratio(color, tokens[ground]), `${name} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['brand', 'violet', 'success', 'warn', 'danger'])(
    '%s clears 4.5:1 inside a 10 percent tint of itself',
    (name) => {
      // The bg-token/10 badge drags the background toward the text, so a value
      // that passes on the bare canvas can still fail inside its own chip.
      const color = tokens[name];
      expect(
        ratio(color, over(color, tokens.surface, 0.1)),
        `${name} in its own tint`,
      ).toBeGreaterThanOrEqual(4.5);
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
    // SC 1.4.11. The ring is solid brand. A color-mix down to 60 percent put
    // it at 2.39:1 on the light palette.
    for (const ground of GROUNDS) {
      expect(ratio(tokens.brand, tokens[ground]), `focus ring on ${ground}`).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it('draws an interactive border at 3:1 or better', () => {
    // SC 1.4.11 again. `line` is 1.25:1 and stays the divider color. A control
    // whose boundary is the only thing identifying it uses line-strong.
    for (const ground of ['surface', 'surface-2'] as const) {
      expect(
        ratio(tokens['line-strong'], tokens[ground]),
        `line-strong on ${ground}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the light palette', () => {
  it('is the screen block and not the print one', () => {
    // Print collapses every text token to black on white. A light palette
    // with no gray in it is the print block read in its place.
    expect(light.surface).toBe('#ffffff');
    expect(light['surface-2']).not.toBe('#ffffff');
    expect(light.brand).not.toBe('#000000');
  });
});

describe('Avatar initials', () => {
  // Each fill names its own text. A fill with an alpha is measured flattened
  // over every ground an avatar sits on, since the ground shows through it.
  const src = readFileSync(join(__dirname, 'components/Avatar.svelte'), 'utf8');
  const fills = [...src.matchAll(/'bg-([a-z-]+)(?:\/(\d+))? text-([a-z-]+)'/g)].map(
    ([, bg, alpha, text]) => ({ bg, alpha: alpha === undefined ? 1 : Number(alpha) / 100, text }),
  );

  it('finds all eight fills, each with its text', () => {
    expect(fills).toHaveLength(8);
  });

  it.each([
    ['dark', dark],
    ['light', light],
  ] as const)('clear 4.5:1 on every fill in the %s palette', (_scope, tokens) => {
    for (const { bg, alpha, text } of fills) {
      for (const ground of GROUNDS) {
        const fill = over(tokens[bg], tokens[ground], alpha);
        expect(
          ratio(tokens[text], fill),
          `${text} on ${bg}/${alpha * 100} over ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("the active Tab's count", () => {
  const src = readFileSync(join(__dirname, 'components/Tabs.svelte'), 'utf8');
  const [, alpha] = /active === tab\.id \? 'bg-brand\/(\d+) text-brand'/.exec(src) ?? [];

  it.each([
    ['dark', dark],
    ['light', light],
  ] as const)('clears 4.5:1 in the %s palette', (_scope, tokens) => {
    expect(alpha, 'the active count paint').toBeDefined();
    for (const ground of GROUNDS) {
      const fill = over(tokens.brand, tokens[ground], Number(alpha) / 100);
      expect(
        ratio(tokens.brand, fill),
        `brand on brand/${alpha} over ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('a chip on a row that highlights', () => {
  // A SidebarNav badge and the AccountMenu initials sit on rows that turn to
  // surface-2 and to line under the pointer. A translucent tint let that
  // through: violet read 3.69:1 on a current row being hovered. The chip is
  // mixed into surface, so it is measured as the one opaque color it is.
  const tone = readFileSync(join(__dirname, 'internal/tone.ts'), 'utf8');
  const chips = [
    ...tone.matchAll(
      /'bg-\[color-mix\(in_srgb,var\(--color-([a-z-]+)\)_(\d+)%,var\(--color-([a-z-]+)\)\)\] text-([a-z-]+)'/g,
    ),
  ].map(([, hue, pct, base, text]) => ({ hue, alpha: Number(pct) / 100, base, text }));

  it('finds a chip for each of the five tones', () => {
    expect(chips.map((c) => c.hue).sort()).toEqual(
      ['brand', 'danger', 'success', 'violet', 'warn'].sort(),
    );
  });

  it.each(['SidebarNav', 'AccountMenu'])('%s paints no translucent tone chip', (name) => {
    const src = readFileSync(join(__dirname, `components/${name}.svelte`), 'utf8');
    expect(src).toContain('...ROW_CHIP_TONE');
    expect(src).not.toMatch(/'bg-(?:brand|success|warn|danger|violet)\/\d+ text-/);
  });

  it.each([
    ['dark', dark],
    ['light', light],
  ] as const)('clears 4.5:1 in the %s palette', (_scope, tokens) => {
    for (const { hue, alpha, base, text } of chips) {
      const fill = over(tokens[hue], tokens[base], alpha);
      expect(ratio(tokens[text], fill), `${text} on ${hue} in ${base}`).toBeGreaterThanOrEqual(4.5);
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
