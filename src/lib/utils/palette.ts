/**
 * Palette checks: the contrast rules the kit's own palettes pass, run over an
 * app's own colors.
 *
 * An app sets its colors by declaring tokens after it imports the stylesheet,
 * and the kit's contrast suite measures only the kit's values. A brand that
 * reads on dark can vanish on white, and a hover fill can drop a button's
 * label below AA while every resting color passes. `checkPalette` lays the
 * overrides for each theme over the kit's values, the way the cascade does,
 * and returns every pair below its WCAG 2.2 floor.
 */
import type { Theme } from './theme.js';

/** The color tokens the rules read, named as in `--color-<token>`. */
export type PaletteToken =
  | 'ink'
  | 'surface'
  | 'surface-2'
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

/** Where a pair is painted. */
export type PaletteUse =
  | 'text'
  | 'badge'
  | 'button label'
  | 'focus ring'
  | 'control border'
  | 'current row'
  | 'head row';

/** One pair below its floor. */
export interface PaletteProblem {
  theme: Theme;
  use: PaletteUse;
  /** The token drawn on top. */
  foreground: PaletteToken;
  /** What it is drawn on: a token, `tint`, `band`, or a badge's own fill. */
  background: string;
  /** Rounded down to two places, so a failing pair never reads as its floor. */
  ratio: number;
  /** 4.5 for text and labels, 3 for a focus ring and a control's border. */
  minimum: number;
}

/**
 * The kit's own values, as `styles/theme.css` declares them. palette.test.ts
 * reads the stylesheet and fails when the two disagree.
 */
export const KIT_PALETTES: Record<Theme, Palette> = {
  dark: {
    ink: '#0b1422',
    surface: '#0c1728',
    'surface-2': '#121e30',
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

/** The brand's share of the current row's `tint` and the head row's `band`. */
export const TINT_SHARE = 0.05;
export const BAND_SHARE = 0.08;

/** A badge is its tone at a tenth over whatever it sits on (`bg-brand/10`). */
const BADGE_SHARE = 0.1;

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

/** `color-mix(in srgb, top share, ground)`, which is what a tint paints. */
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
 *     checkPalette({ light: { brand: '#b0185b', 'brand-light': '#99154f' } });
 */
export function checkPalette(overrides: PaletteOverrides = {}): PaletteProblem[] {
  const problems: PaletteProblem[] = [];
  for (const theme of ['dark', 'light'] as const) {
    const p = merge(theme, overrides[theme] ?? {});
    const tint = mix(p.brand, p.surface, TINT_SHARE);
    const band = mix(p.brand, p.surface, BAND_SHARE);
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
      for (const ground of GROUNDS) check('text', name, ground, p[ground], 4.5);
    }
    for (const tone of TONES) {
      for (const [name, ground] of [...GROUNDS.map((g) => [g, p[g]]), ['tint', tint]]) {
        check('badge', tone, `${tone} at 10% over ${name}`, mix(p[tone], ground, BADGE_SHARE), 4.5);
      }
    }
    for (const fill of FILLS) check('button label', 'ink', fill, p[fill], 4.5);
    for (const ground of GROUNDS) check('focus ring', 'brand', ground, p[ground], 3);
    for (const ground of ['surface', 'surface-2'] as const) {
      check('control border', 'line-strong', ground, p[ground], 3);
    }
    for (const name of ['fg', 'muted', 'faint', 'brand'] as const) {
      check('current row', name, 'tint', tint, 4.5);
      check('head row', name, 'band', band, 4.5);
    }
  }
  return problems;
}
