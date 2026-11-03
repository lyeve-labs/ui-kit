import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_HEADER, PANEL_DANGER_SURFACE } from './internal/layout.js';

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
    // Read from the base layer. The forced colors block above it states a
    // focus outline of its own, in the system highlight.
    const base = css.slice(css.indexOf('@layer base'));
    const rule = base.slice(base.indexOf(':focus-visible'), base.indexOf(':focus:not('));
    expect(rule).toContain('outline: 2px solid var(--color-brand)');
    expect(rule).not.toContain('color-mix');
  });
});

describe('the danger panel surface', () => {
  // The fill is danger mixed into surface, which is opaque, so it paints the
  // same on a page and inside a card. The share is read from the class the
  // panel draws, so a heavier tint cannot pass here and ship darker.
  const share = PANEL_DANGER_SURFACE.match(/var\(--color-danger\)_(\d+)%,var\(--color-surface\)/);

  it('mixes danger into surface', () => {
    expect(share, 'no danger-into-surface mix in the panel surface').toBeTruthy();
  });

  it.each([
    ['dark', dark],
    ['light', light],
  ] as const)('holds every text token at 4.5:1 in the %s palette', (scope, tokens) => {
    // fg is the body, muted the description, danger the heading, and faint the
    // hint under a field in a form the panel holds.
    const ground = over(tokens.danger, tokens.surface, Number(share![1]) / 100);
    for (const name of ['fg', 'muted', 'faint', 'danger']) {
      expect(
        ratio(tokens[name], ground),
        `${name} on the ${scope} danger panel`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/**
 * Depth is drawn in translucent colors, so each one is measured where it
 * lands: flattened over the surface it sits on, in both palettes. The three
 * are read from the stylesheet the same way the hex tokens are.
 */
function depth(scope: 'dark' | 'light'): Record<string, { hex: string; alpha: number }> {
  const marker = css.indexOf("html[data-theme='light'] {");
  const region =
    scope === 'dark' ? css.slice(0, marker) : css.slice(marker, css.indexOf('}', marker));
  const out: Record<string, { hex: string; alpha: number }> = {};
  for (const [, name, r, g, b, a] of region.matchAll(
    /--color-(highlight|shade|glow):\s*rgb\((\d+) (\d+) (\d+) \/ ([0-9.]+)\);/g,
  )) {
    const hex = `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
    out[name] = { hex, alpha: Number(a) };
  }
  return out;
}

/** The share of violet in the hero wash, read from the token. */
const heroShare = Number(
  /--background-image-hero:[^;]*color-mix\(in srgb, var\(--color-violet\) (\d+)%, var\(--color-ink\)\)/.exec(
    css,
  )?.[1],
);

/**
 * The share of the shade the field well paints. The text of a field sits on
 * plain surface-2 below the band, which the palette suite measures, and
 * wellReach below proves it stays below.
 */
const wellToken = /--inset-shadow-well:([^;]*);/.exec(css)?.[1] ?? '';
const wellShare =
  Number(/color-mix\(in srgb, var\(--color-shade\) (\d+)%, transparent\)/.exec(wellToken)?.[1]) / 100;

describe('the field well', () => {
  it('names the share of shade it paints', () => {
    expect(wellShare).toBeGreaterThan(0);
    expect(wellShare).toBeLessThanOrEqual(1);
  });

  it('darkens only a band above the line of text', () => {
    // A 38px control with a 20px line leaves 9px above the text. The shadow
    // reaches its offset plus its blur below the top edge, and has to end
    // inside that gap, or the placeholder would sit on the darker ground.
    const [, y, blur] = /inset 0 (\d+)px (\d+)px/.exec(wellToken) ?? [];
    expect(Number(y) + Number(blur)).toBeLessThanOrEqual(9);
  });
});

describe.each([
  ['dark', dark],
  ['light', light],
] as const)('depth in the %s palette', (scope, tokens) => {
  const d = depth(scope);
  const flat = (name: 'highlight' | 'shade' | 'glow', ground: string) =>
    over(d[name].hex, ground, d[name].alpha);

  it('declares all three depth colors', () => {
    expect(Object.keys(d).sort()).toEqual(['glow', 'highlight', 'shade']);
  });

  it.each(TEXT_TOKENS)('%s clears 4.5:1 at both ends of the hero wash', (name) => {
    // A gradient has two grounds and the reader gets the worse one. An empty
    // state and the sign-in page carry the title, the description, a link and
    // a status line on it.
    expect(heroShare).toBeGreaterThan(0);
    const ends = { ink: tokens.ink, violet: over(tokens.violet, tokens.ink, heroShare / 100) };
    for (const [end, ground] of Object.entries(ends)) {
      expect(ratio(tokens[name], ground), `${name} on the ${end} end`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the field border at 3:1 against the darkest band of the well inside it', () => {
    // The inner shadow darkens a band along the field's top edge, right
    // against the border. The well paints the shade at a share of its
    // strength, read from the token.
    const ground = over(d.shade.hex, tokens['surface-2'], d.shade.alpha * wellShare);
    expect(ratio(tokens['line-strong'], ground)).toBeGreaterThanOrEqual(3);
  });

  it('keeps the focus ring at 3:1 on top of its own glow', () => {
    // The glow fills the gap between a control and its ring and spreads past
    // it, so the ring is read against glow over the ground, not the ground.
    for (const ground of GROUNDS) {
      const halo = flat('glow', tokens[ground]);
      expect(ratio(tokens.brand, halo), `ring over glow on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the primary fill at 3:1 against the glow around it', () => {
    // The button's boundary is its fill. Hovered, the fill sits in its glow.
    for (const ground of GROUNDS) {
      const halo = flat('glow', tokens[ground]);
      expect(ratio(tokens['brand-light'], halo), `hovered fill on ${ground}`).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it.each(['brand', 'violet'])('draws the %s end of the accent at 3:1 on every ground', (name) => {
    // The accent is a mark: the active tab and nav indicator on the page and
    // the sidebar, and a progress fill on its surface-2 track. Each end has to
    // clear the non-text floor wherever it lands.
    for (const ground of GROUNDS) {
      expect(ratio(tokens[name], tokens[ground]), `${name} on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });
});

/**
 * The surfaces' own gradients, measured at their stops. Each token is read
 * from the block that declares it for that palette, a stop is evaluated to a
 * color and an alpha, and every text token a surface carries is measured on
 * every stop.
 */
type Paint = { hex: string; alpha: number };

/** The top-level comma-separated arguments of a function's argument list. */
function args(list: string): string[] {
  const out = [''];
  let depth = 0;
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) out.push('');
    else out[out.length - 1] += ch;
  }
  return out.map((a) => a.trim());
}

function paint(expr: string, tokens: Record<string, string>): Paint {
  const e = expr.trim();
  if (e === 'transparent') return { hex: '#000000', alpha: 0 };
  if (/^#[0-9a-f]{6}$/i.test(e)) return { hex: e.toLowerCase(), alpha: 1 };
  const v = /^var\(--color-([a-z0-9-]+)\)$/.exec(e);
  if (v) return { hex: tokens[v[1]], alpha: 1 };
  const rgb = /^rgb\((\d+) (\d+) (\d+) \/ ([0-9.]+)\)$/.exec(e);
  if (rgb) {
    const hex = `#${rgb.slice(1, 4).map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
    return { hex, alpha: Number(rgb[4]) };
  }
  const mix = /^color-mix\(in srgb, (.+)\)$/.exec(e);
  if (mix) {
    const [a, b] = args(mix[1]);
    const [, color, pct] = /^(.+) (\d+)%$/.exec(a) ?? [];
    const share = Number(pct) / 100;
    const first = paint(color, tokens);
    const second = paint(b, tokens);
    if (second.alpha === 0) return { hex: first.hex, alpha: first.alpha * share };
    return { hex: over(first.hex, second.hex, share), alpha: 1 };
  }
  throw new Error(`cannot evaluate ${e}`);
}

/** A gradient's color stops, its position arguments and stop offsets dropped. */
function stops(gradient: string, tokens: Record<string, string>): Paint[] {
  const inner = /^[a-z-]+-gradient\(([\s\S]*)\)$/.exec(gradient.trim())?.[1] ?? '';
  return args(inner)
    .filter((a) => !/^(?:\d+deg|to |ellipse|circle|\d+% \d+px)/.test(a))
    .map((a) => paint(a.replace(/\s+-?\d+(?:%|px)?$/, ''), tokens));
}

/** A background-image token as the given palette declares it, falling back to dark. */
function image(scope: 'dark' | 'light', name: string): string {
  const marker = css.indexOf("html[data-theme='light'] {");
  const read = (region: string) =>
    new RegExp(`--background-image-${name}:([^;]+);`).exec(region)?.[1].replace(/\s+/g, ' ').trim();
  const light = css.slice(marker, css.indexOf('\n}', marker));
  return (scope === 'light' ? read(light) : undefined) ?? read(css.slice(0, marker)) ?? '';
}

describe.each([
  ['dark', dark],
  ['light', light],
] as const)('surface light in the %s palette', (scope, tokens) => {
  const flatten = (p: Paint, ground: string) => over(p.hex, ground, p.alpha);
  /** Both canvas pools at full strength over ink, where they overlap. */
  const canvasPeak = () =>
    args(image(scope, 'canvas'))
      .map((g) => stops(g, tokens)[0])
      .reduce((ground, pool) => flatten(pool, ground), tokens.ink);

  it('reads every stop of the four surface gradients', () => {
    expect(args(image(scope, 'canvas'))).toHaveLength(2);
    for (const name of ['sidebar', 'card', 'lift']) {
      expect(stops(image(scope, name), tokens).length, name).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(TEXT_TOKENS)('%s clears 4.5:1 where the canvas light is brightest', (name) => {
    // The page title, its description and the first row of content sit in
    // the light at the top of the page.
    expect(ratio(tokens[name], canvasPeak())).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['fg', 'muted', 'faint', 'brand'])(
    '%s clears 4.5:1 on the translucent header over the canvas light',
    (name) => {
      const share = Number(/bg-surface\/(\d+)/.exec(APP_HEADER)?.[1]) / 100;
      expect(share).toBeGreaterThan(0);
      const ground = over(tokens.surface, canvasPeak(), share);
      expect(ratio(tokens[name], ground)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(TEXT_TOKENS)('%s clears 4.5:1 at both ends of the sidebar and the card', (name) => {
    for (const surface of ['sidebar', 'card']) {
      for (const stop of stops(image(scope, surface), tokens)) {
        const ground = flatten(stop, tokens.surface);
        expect(ratio(tokens[name], ground), `${name} on the ${surface} at ${ground}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it.each(['fg', 'muted', 'faint', 'brand'])('%s clears 4.5:1 on the brand tint', (name) => {
    // The table's head row carries faint labels, a hovered row fg and muted
    // text, and the current nav row brand.
    const tint = paint('color-mix(in srgb, var(--color-brand) 8%, var(--color-surface))', tokens);
    expect(css).toContain('--color-tint: color-mix(in srgb, var(--color-brand) 8%, var(--color-surface));');
    expect(ratio(tokens[name], tint.hex)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['brand', 'brand-light', 'brand-deep'])(
    'keeps the primary label at 4.5:1 under the lift on %s',
    (fill) => {
      // The lift is brightest at the top of the button, over the resting,
      // hovered and held colors alike.
      const [top] = stops(image(scope, 'lift'), tokens);
      expect(ratio(tokens.ink, flatten(top, tokens[fill]))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps the primary fill at 3:1 against its own resting and hovered pool', () => {
    // The pool is brand at a share, read from each token. Measured at full
    // share, which the blur never reaches, on every ground a button sits on.
    const share = (token: string) =>
      Number(new RegExp(`${token}:[^;]*var\\(--color-brand\\) (\\d+)%`).exec(css)?.[1]) / 100;
    for (const ground of GROUNDS) {
      const rest = over(tokens.brand, tokens[ground], share('--shadow-primary'));
      const hover = over(tokens.brand, tokens[ground], share('--shadow-primary-hover'));
      expect(ratio(tokens.brand, rest), `resting on ${ground}`).toBeGreaterThanOrEqual(3);
      expect(ratio(tokens['brand-light'], hover), `hovered on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });
});
