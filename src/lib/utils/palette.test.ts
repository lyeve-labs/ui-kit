import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHIP_TONE } from '../internal/tone.js';
import {
  AVATAR_FILLS,
  BADGE_SHARE,
  BAND_SHARE,
  DANGER_PANEL_SHARE,
  FILTERED_FILLS,
  HEADER_SHARE,
  HELD_BRIGHTNESS,
  HERO_SHARE,
  HOVER_BRIGHTNESS,
  KIT_DEPTH,
  KIT_PALETTES,
  LIFT_ALPHA,
  ROW_CHIPS,
  TINT_SHARE,
  WELL_SHARE,
  checkPalette,
  type Palette,
} from './palette.js';

const css = readFileSync(join(__dirname, '../styles/theme.css'), 'utf8');
const source = (name: string) =>
  readFileSync(join(__dirname, `../components/${name}.svelte`), 'utf8');

/** The dark palette is everything before the light block, the light one that block alone. */
function region(scope: 'dark' | 'light'): string {
  const marker = css.indexOf("html[data-theme='light'] {");
  return scope === 'dark' ? css.slice(0, marker) : css.slice(marker, css.indexOf('\n}', marker));
}

const percent = (pattern: RegExp, text: string) => Number(pattern.exec(text)?.[1]) / 100;

describe('checkPalette measures what the kit paints', () => {
  it.each(['dark', 'light'] as const)('reads the %s palette the stylesheet declares', (scope) => {
    // The check lays an app's colors over these, so a value that drifted
    // from the stylesheet would measure a palette nobody ships.
    const declared: Record<string, string> = {};
    for (const [, name, value] of region(scope).matchAll(
      /--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi,
    )) {
      declared[name] = value.toLowerCase();
    }
    for (const [token, value] of Object.entries(KIT_PALETTES[scope])) {
      expect(declared[token], `--color-${token}`).toBe(value);
    }
  });

  it.each(['dark', 'light'] as const)('reads the %s depth the stylesheet declares', (scope) => {
    const paint = (name: string) => {
      const [, r, g, b, a] =
        new RegExp(`--color-${name}:\\s*rgb\\((\\d+) (\\d+) (\\d+) \\/ ([0-9.]+)\\);`).exec(
          region(scope),
        ) ?? [];
      const hex = `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
      return { hex, alpha: Number(a) };
    };
    expect(paint('glow')).toEqual(KIT_DEPTH[scope].glow);
    expect(paint('shade')).toEqual(KIT_DEPTH[scope].shade);

    // The light block declares a canvas of its own, and dark reads the theme's.
    const canvas = /--background-image-canvas:([^;]+);/.exec(region(scope))?.[1] ?? '';
    const pools = [
      ...canvas.matchAll(/color-mix\(in srgb, var\(--color-([a-z-]+)\) (\d+)%, transparent\)/g),
    ].map(([, token, pct]) => [token, Number(pct) / 100]);
    expect(pools).toEqual(KIT_DEPTH[scope].canvas);
  });

  it('mixes each ground at the share the stylesheet declares', () => {
    const brandInSurface = (token: string) =>
      percent(
        new RegExp(
          `--color-${token}: color-mix\\(in srgb, var\\(--color-brand\\) (\\d+)%, var\\(--color-surface\\)\\);`,
        ),
        css,
      );
    expect(brandInSurface('tint')).toBe(TINT_SHARE);
    // The focus ring the check measures is brand-deep in both themes.
    expect(css).toMatch(/@theme inline \{\s*--color-focus: var\(--color-brand-deep\);\s*\}/);
    expect(brandInSurface('band')).toBe(BAND_SHARE);
    expect(
      percent(
        /--background-image-hero:[^;]*color-mix\(in srgb, var\(--color-violet\) (\d+)%, var\(--color-ink\)\)/,
        css,
      ),
    ).toBe(HERO_SHARE);
    expect(
      percent(
        /--inset-shadow-well:[^;]*color-mix\(in srgb, var\(--color-shade\) (\d+)%, transparent\)/,
        css,
      ),
    ).toBe(WELL_SHARE);
    // One lift for both themes: the light block declares none of its own.
    expect(region('light')).not.toContain('--background-image-lift');
    expect(
      Number(
        /--background-image-lift: linear-gradient\(180deg, rgb\(255 255 255 \/ ([0-9.]+)\)/.exec(
          css,
        )?.[1],
      ),
    ).toBe(LIFT_ALPHA);
  });

  it('paints badges, tags and tab counts at the share it measures', () => {
    // Badge and Tag paint the chip map they share, so it is read once for both.
    const sources: Record<string, string> = {
      'Badge and Tag': Object.values(CHIP_TONE).join(' '),
      Tabs: source('Tabs'),
    };
    for (const [name, src] of Object.entries(sources)) {
      const shares = [...src.matchAll(/bg-(?:brand|violet|success|warn|danger)\/(\d+) text-/g)].map(
        ([, pct]) => Number(pct) / 100,
      );
      expect(shares.length, name).toBeGreaterThan(0);
      for (const share of shares) expect(share, name).toBe(BADGE_SHARE);
    }
  });

  it('paints every avatar fill it measures', () => {
    const fills = [...source('Avatar').matchAll(/'bg-([a-z-]+)(?:\/(\d+))? text-([a-z-]+)'/g)].map(
      ([, fill, pct, text]) => [fill, pct === undefined ? 1 : Number(pct) / 100, text],
    );
    expect(fills).toEqual(AVATAR_FILLS);
  });

  it('brightens and dims the buttons it measures by the filters they carry', () => {
    // Its comments name filters it does not paint.
    const button = source('Button')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    const filtered = [
      ...button.matchAll(
        /bg-([a-z-]+) text-ink hover:brightness-(\d+) not-aria-disabled:active:brightness-(\d+)/g,
      ),
    ].map(([, fill, hover, held]) => [fill, Number(hover) / 100, Number(held) / 100]);
    expect(filtered).toEqual(
      FILTERED_FILLS.map((fill) => [fill, HOVER_BRIGHTNESS, HELD_BRIGHTNESS]),
    );
    // A variant filtered some other way would go unmeasured.
    expect(button.match(/(?:hover|active):brightness-\d/g)).toHaveLength(FILTERED_FILLS.length * 2);
  });

  it('reads the shares the shell, the danger panel and the row chips paint', () => {
    expect(HEADER_SHARE).toBeGreaterThan(0);
    expect(HEADER_SHARE).toBeLessThan(1);
    expect(DANGER_PANEL_SHARE).toBeGreaterThan(0);
    expect(DANGER_PANEL_SHARE).toBeLessThan(1);
    expect(ROW_CHIPS.map((c) => c.hue).sort()).toEqual(
      ['brand', 'danger', 'success', 'violet', 'warn'].sort(),
    );
    for (const chip of ROW_CHIPS) {
      expect(chip.share, chip.hue).toBeGreaterThan(0);
      expect(chip.share, chip.hue).toBeLessThan(1);
      expect(KIT_PALETTES.dark[chip.base], chip.base).toBeTruthy();
      expect(KIT_PALETTES.dark[chip.text], chip.text).toBeTruthy();
    }
  });

  it('prints black on white whatever palette an app sets', () => {
    // An app's light rule comes after the stylesheet with the same selector,
    // so only an important declaration keeps the paper palette above it.
    const print = css.slice(css.search(/^@media print/m));
    const rule = print.slice(print.indexOf('{', print.indexOf("html[data-theme='light']")));
    const block = rule.slice(0, rule.indexOf('}'));
    const declarations = [...block.matchAll(/^\s+(--[a-z0-9-]+):([^;]+);/gm)];
    expect(declarations.length).toBeGreaterThan(20);
    for (const [, name, value] of declarations) expect(value, name).toMatch(/!important$/);
  });
});

describe('checkPalette', () => {
  it("passes the kit's own palettes", () => {
    expect(checkPalette()).toEqual([]);
  });

  it('reports a light brand that reads only on dark', () => {
    const problems = checkPalette({ light: { brand: '#00d4ff' } });
    expect(problems.every((p) => p.theme === 'light')).toBe(true);
    expect(problems).toContainEqual({
      theme: 'light',
      use: 'text',
      foreground: 'brand',
      background: 'surface',
      ratio: 1.77,
      minimum: 4.5,
    });
    expect(new Set(problems.map((p) => p.use))).toEqual(
      new Set(['text', 'badge', 'avatar', 'row chip', 'button label']),
    );
  });

  it('measures the focus ring in brand-deep, the color it is drawn in', () => {
    const problems = checkPalette({ light: { 'brand-deep': '#00d4ff' } });
    expect(problems).toContainEqual({
      theme: 'light',
      use: 'focus ring',
      foreground: 'brand-deep',
      background: 'surface',
      ratio: 1.77,
      minimum: 3,
    });
  });

  it('measures the label at the top of a hovered button, under the lift', () => {
    // The bare fill clears 4.5:1. On light the lift brightens the fill
    // toward the pale label, and that is where the label reads.
    const problems = checkPalette({ light: { 'brand-light': '#9a5792' } });
    expect(problems).toEqual([
      {
        theme: 'light',
        use: 'button label',
        foreground: 'ink',
        background: 'brand-light under the lift',
        ratio: 4.05,
        minimum: 4.5,
      },
    ]);
  });

  it('measures avatar initials on a tinted fill', () => {
    expect(checkPalette({ light: { fg: '#485a91' } })).toContainEqual({
      theme: 'light',
      use: 'avatar',
      foreground: 'fg',
      background: 'brand at 25% over surface-2',
      ratio: 3.7,
      minimum: 4.5,
    });
  });

  it('measures a filtered button with its label dimmed alongside the fill', () => {
    // At rest the label reads 5.37:1. Held, the filter darkens both.
    expect(checkPalette({ dark: { violet: '#f614e2' } })).toEqual([
      {
        theme: 'dark',
        use: 'button label',
        foreground: 'ink',
        background: 'violet held at 90% brightness',
        ratio: 4.48,
        minimum: 4.5,
      },
    ]);
  });

  it("measures a hovered primary's edge against its glow", () => {
    expect(checkPalette({ dark: { 'brand-light': '#70883c' } })).toContainEqual(
      expect.objectContaining({ theme: 'dark', use: 'button edge', ratio: 2.98, minimum: 3 }),
    );
  });

  it('keeps each theme to its own overrides', () => {
    const problems = checkPalette({ dark: { 'line-strong': '#1a293c' } });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.theme === 'dark' && p.use === 'control border')).toBe(true);
  });

  it('never rounds a failing pair up to its floor', () => {
    const problems = checkPalette({ dark: { faint: '#7a8396' }, light: { faint: '#767c8a' } });
    expect(problems.length).toBeGreaterThan(0);
    for (const p of problems) expect(p.ratio).toBeLessThan(p.minimum);
  });

  it('reads three-digit hex', () => {
    expect(checkPalette({ dark: { fg: '#FFF' }, light: { fg: '#000' } })).toEqual([]);
  });

  it('refuses a color it cannot measure rather than passing it', () => {
    expect(() => checkPalette({ light: { brand: 'rgb(0 90 119)' } })).toThrow(
      'the light brand is rgb(0 90 119)',
    );
    expect(() => checkPalette({ dark: { brand: '#00d4ff80' } })).toThrow(TypeError);
  });

  it('refuses a token or a theme it does not read rather than ignoring it', () => {
    const misspelled = { 'brand-ligth': '#5fd9f4' } as unknown as Partial<Palette>;
    expect(() => checkPalette({ dark: misspelled })).toThrow('brand-ligth is not a token');
    expect(() => checkPalette({ ligth: { brand: '#00d4ff' } } as never)).toThrow(
      'ligth is not a theme',
    );
  });
});
