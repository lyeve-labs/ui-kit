/**
 * Palette checks: the contrast rules the kit's own palettes pass, run over an
 * app's own colors.
 *
 * An app sets its colors by declaring tokens after it imports the stylesheet,
 * and the kit's contrast suite measures only the kit's values. A brand that
 * reads on dark can vanish on white, and a hover fill can drop a button's
 * label below AA while every resting color passes. `checkPalette` lays the
 * overrides for each theme over the kit's values, the way the cascade does,
 * paints every ground the kit mixes from them, and returns every pair below
 * its WCAG 2.2 floor.
 */
import { APP_HEADER, PANEL_DANGER_SURFACE } from '../internal/layout.js';
import { ROW_CHIP_TONE } from '../internal/tone.js';
import type { Theme } from './theme.js';

/** The color tokens the rules read, named as in `--color-<token>`. */
export type PaletteToken =
  | 'ink'
  | 'surface'
  | 'surface-2'
  | 'line'
  | 'line-strong'
  | 'fg'
  | 'muted'
  | 'faint'
  | 'brand'
  | 'brand-light'
  | 'brand-deep'
  | 'violet'
  | 'success'
  | 'warn'
  | 'danger';

export type Palette = Record<PaletteToken, string>;

/** The colors an app sets for each theme. A token it leaves out keeps the kit's value. */
export type PaletteOverrides = Partial<Record<Theme, Partial<Palette>>>;

/** What the pair is: text on a ground, or one of the kit's painted marks. */
export type PaletteUse =
  | 'text'
  | 'badge'
  | 'avatar'
  | 'row chip'
  | 'button label'
  | 'button edge'
  | 'focus ring'
  | 'control border';

/** One pair below its floor. */
export interface PaletteProblem {
  theme: Theme;
  use: PaletteUse;
  /** The token drawn on top. */
  foreground: PaletteToken;
  /** What it is drawn on: a token, or a ground the kit mixes, such as `brand at 10% over surface`. */
  background: string;
  /** Rounded down to two places, so a failing pair never reads as its floor. */
  ratio: number;
  /** 4.5 for text and labels, 3 for a focus ring, a control's border and a button's edge. */
  minimum: number;
}

/** A color and the alpha it is painted at. */
type Paint = { hex: string; alpha: number };

/**
 * The kit's own values, as `styles/theme.css` declares them. palette.test.ts
 * reads the stylesheet and fails when the two disagree.
 */
export const KIT_PALETTES: Record<Theme, Palette> = {
  dark: {
    ink: '#0b1422',
    surface: '#0c1728',
    'surface-2': '#121e30',
    line: '#192a3d',
    'line-strong': '#616d80',
    fg: '#e6e8ee',
    muted: '#9aa1ad',
    faint: '#8b94a7',
    brand: '#00d4ff',
    'brand-light': '#5fd9f4',
    'brand-deep': '#0099c4',
    violet: '#9587f2',
    success: '#22c55e',
    warn: '#f59e0b',
    danger: '#f87171',
  },
  light: {
    ink: '#f6f7f9',
    surface: '#ffffff',
    'surface-2': '#e6e8ee',
    line: '#d6d9e0',
    'line-strong': '#767d8e',
    fg: '#111827',
    muted: '#525866',
    faint: '#616774',
    brand: '#005a77',
    'brand-light': '#004f69',
    'brand-deep': '#00455c',
    violet: '#5544da',
    success: '#126c34',
    warn: '#904207',
    danger: '#ab1a1a',
  },
};

/**
 * The depth the stylesheet paints from the tokens, which the checks paint the
 * same way: the canvas light's two pools over ink, the glow a focused control
 * and a hovered primary sit in, and the shade the field well draws. Pinned to
 * the stylesheet by palette.test.ts.
 */
export const KIT_DEPTH: Record<
  Theme,
  { canvas: [PaletteToken, number][]; glow: Paint; shade: Paint }
> = {
  dark: {
    canvas: [
      ['brand', 0.06],
      ['violet', 0.07],
    ],
    glow: { hex: '#00d4ff', alpha: 0.16 },
    shade: { hex: '#02060e', alpha: 0.5 },
  },
  light: {
    canvas: [
      ['brand', 0.06],
      ['violet', 0.05],
    ],
    glow: { hex: '#0099c4', alpha: 0.22 },
    shade: { hex: '#101828', alpha: 0.08 },
  },
};

/** The brand's share of the current row's `tint` and the head row's `band`. */
export const TINT_SHARE = 0.05;
export const BAND_SHARE = 0.08;
/** Violet's share of the hero wash's lit end, mixed into ink. */
export const HERO_SHARE = 0.05;
/** How much of the shade the field well paints. */
export const WELL_SHARE = 0.5;
/** The white at the top of a filled button, where its label reads worst on light. */
export const LIFT_ALPHA = 0.08;
/** A badge is its tone at a tenth over whatever it sits on, and so are a tag and a tab's count. */
export const BADGE_SHARE = 0.1;

/** What an avatar paints: the fill, its alpha and the initials, as Avatar.svelte draws them. */
export const AVATAR_FILLS: [PaletteToken, number, PaletteToken][] = [
  ['violet', 1, 'ink'],
  ['brand', 1, 'ink'],
  ['success', 1, 'ink'],
  ['warn', 1, 'ink'],
  ['danger', 1, 'ink'],
  ['violet', 0.25, 'fg'],
  ['brand', 0.25, 'fg'],
  ['success', 0.25, 'fg'],
];

/** The shares the components' own classes name, read from the constants they paint. */
const classShare = (pattern: RegExp, classes: string) => Number(pattern.exec(classes)?.[1]) / 100;
export const HEADER_SHARE = classShare(/bg-surface\/(\d+)/, APP_HEADER);
export const DANGER_PANEL_SHARE = classShare(
  /var\(--color-danger\)_(\d+)%,var\(--color-surface\)/,
  PANEL_DANGER_SURFACE,
);
/** A chip on a row that highlights: its tone mixed into a base, under text of its own. */
export const ROW_CHIPS = Object.values(ROW_CHIP_TONE).map((classes) => {
  const [, hue, share, base, text] =
    /color-mix\(in_srgb,var\(--color-([a-z-]+)\)_(\d+)%,var\(--color-([a-z-]+)\)\)\] text-([a-z-]+)/.exec(
      classes,
    ) ?? [];
  return {
    hue: hue as PaletteToken,
    share: Number(share) / 100,
    base: base as PaletteToken,
    text: text as PaletteToken,
  };
});

/** Body text sits on one of these, and a token has to clear the worst. */
const GROUNDS = ['ink', 'surface', 'surface-2'] as const;
const TEXT = [
  'fg',
  'muted',
  'faint',
  'brand',
  'brand-deep',
  'violet',
  'success',
  'warn',
  'danger',
] as const;
const TONES = ['brand', 'violet', 'success', 'warn', 'danger'] as const;
/** Every filled button labels in ink, at rest, under the pointer and held. */
const FILLS = ['brand', 'brand-light', 'brand-deep', 'violet', 'danger'] as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function channels(hex: string): number[] {
  const six = hex.length === 4 ? hex.replace(/[0-9a-f]/gi, '$&$&') : hex;
  return [1, 3, 5].map((i) => parseInt(six.slice(i, i + 2), 16));
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `color-mix(in srgb, top share, ground)`, which is also a translucent paint flattened. */
function mix(top: string, ground: string, share: number): string {
  const [t, g] = [channels(top), channels(ground)];
  return `#${t
    .map((c, i) => Math.round(c * share + g[i] * (1 - share)))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

function merge(theme: Theme, colors: Partial<Palette>): Palette {
  const palette = { ...KIT_PALETTES[theme] };
  for (const [token, value] of Object.entries(colors)) {
    if (!Object.hasOwn(palette, token)) {
      throw new TypeError(`checkPalette: ${token} is not a token it reads`);
    }
    // A color it cannot read would measure as NaN, and NaN fails no floor.
    if (typeof value !== 'string' || !HEX.test(value)) {
      throw new TypeError(
        `checkPalette: the ${theme} ${token} is ${String(value)}. Give it as #rgb or #rrggbb`,
      );
    }
    palette[token as PaletteToken] = value.toLowerCase();
  }
  return palette;
}

/**
 * Every pair in a custom palette that falls below its floor, dark first. An
 * empty list means the palette passes every rule the kit's own palettes pass.
 *
 *     checkPalette({ light: { brand: '#b51758', 'brand-light': '#9f144d', 'brand-deep': '#8b1244' } });
 *
 * The canvas is measured at the center of each pool, where its light is
 * strongest: the pools fade out before either reaches the other's center.
 *
 * The sidebar and the light card wash between ink and surface, and the two
 * ends bound every point between them when one of the two is at least as
 * light as the other in red, green and blue, as the kit's are. Two grounds of
 * opposing hues can make the middle of a light wash a little darker than
 * either end.
 */
export function checkPalette(overrides: PaletteOverrides = {}): PaletteProblem[] {
  for (const key of Object.keys(overrides)) {
    if (key !== 'dark' && key !== 'light') {
      throw new TypeError(`checkPalette: ${key} is not a theme. Use dark or light`);
    }
  }
  const problems: PaletteProblem[] = [];
  for (const theme of ['dark', 'light'] as const) {
    const p = merge(theme, overrides[theme] ?? {});
    const depth = KIT_DEPTH[theme];
    const pools = depth.canvas.map(([token, a]) => [token, mix(p[token], p.ink, a)] as const);
    const glowOver = (ground: string) => mix(depth.glow.hex, ground, depth.glow.alpha);
    const grounds = Object.fromEntries(GROUNDS.map((g) => [g, p[g]])) as Record<string, string>;
    const lit: Record<string, string> = {
      ...grounds,
      hero: mix(p.violet, p.ink, HERO_SHARE),
      ...Object.fromEntries(pools.map(([token, hex]) => [`${token} pool`, hex])),
    };
    const rows: Record<string, string> = {
      ...Object.fromEntries(
        pools.map(([token, hex]) => [
          `header over the ${token} pool`,
          mix(p.surface, hex, HEADER_SHARE),
        ]),
      ),
      tint: mix(p.brand, p.surface, TINT_SHARE),
      band: mix(p.brand, p.surface, BAND_SHARE),
    };
    const check = (
      use: PaletteUse,
      foreground: PaletteToken,
      background: string,
      ground: string,
      minimum: number,
    ) => {
      const ratio = contrast(p[foreground], ground);
      if (ratio < minimum) {
        problems.push({
          theme,
          use,
          foreground,
          background,
          ratio: Math.floor(ratio * 100) / 100,
          minimum,
        });
      }
    };

    for (const name of TEXT) {
      for (const [ground, hex] of Object.entries(lit)) check('text', name, ground, hex, 4.5);
    }
    for (const name of ['fg', 'muted', 'faint', 'brand'] as const) {
      for (const [ground, hex] of Object.entries(rows)) check('text', name, ground, hex, 4.5);
    }
    // A held menu row, and a danger panel with its heading, body and hints.
    check('text', 'fg', 'line', p.line, 4.5);
    for (const name of ['fg', 'muted', 'faint', 'danger'] as const) {
      check('text', name, 'danger panel', mix(p.danger, p.surface, DANGER_PANEL_SHARE), 4.5);
    }

    const badgeGrounds = { ...grounds, tint: rows.tint, hero: lit.hero };
    for (const tone of TONES) {
      for (const [name, hex] of Object.entries(badgeGrounds)) {
        const chip = mix(p[tone], hex, BADGE_SHARE);
        check('badge', tone, `${tone} at 10% over ${name}`, chip, 4.5);
      }
    }
    for (const [fill, alpha, text] of AVATAR_FILLS) {
      for (const ground of GROUNDS) {
        const label = alpha === 1 ? fill : `${fill} at ${alpha * 100}% over ${ground}`;
        check('avatar', text, label, mix(p[fill], p[ground], alpha), 4.5);
      }
    }
    for (const { hue, share, base, text } of ROW_CHIPS) {
      check(
        'row chip',
        text,
        `${hue} at ${share * 100}% in ${base}`,
        mix(p[hue], p[base], share),
        4.5,
      );
    }

    for (const fill of FILLS) check('button label', 'ink', fill, p[fill], 4.5);
    for (const fill of ['brand', 'brand-light', 'brand-deep'] as const) {
      const lifted = mix('#ffffff', p[fill], LIFT_ALPHA);
      check('button label', 'ink', `${fill} under the lift`, lifted, 4.5);
    }
    for (const ground of GROUNDS) {
      check('button edge', 'brand-light', `glow over ${ground}`, glowOver(p[ground]), 3);
      check('focus ring', 'brand', ground, p[ground], 3);
      check('focus ring', 'brand', `glow over ${ground}`, glowOver(p[ground]), 3);
    }
    for (const ground of ['surface', 'surface-2'] as const) {
      check('control border', 'line-strong', ground, p[ground], 3);
    }
    const well = mix(depth.shade.hex, p['surface-2'], depth.shade.alpha * WELL_SHARE);
    check('control border', 'line-strong', 'field well', well, 3);
  }
  return problems;
}
