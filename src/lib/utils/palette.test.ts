import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BAND_SHARE, KIT_PALETTES, TINT_SHARE, checkPalette, type Palette } from './palette.js';

const css = readFileSync(join(__dirname, '../styles/theme.css'), 'utf8');

/** The dark palette is everything before the light block, the light one that block alone. */
function declared(scope: 'dark' | 'light'): Record<string, string> {
  const marker = css.indexOf("html[data-theme='light'] {");
  const region =
    scope === 'dark' ? css.slice(0, marker) : css.slice(marker, css.indexOf('}', marker));
  const out: Record<string, string> = {};
  for (const [, name, value] of region.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    out[name] = value.toLowerCase();
  }
  return out;
}

describe('checkPalette', () => {
  it.each(['dark', 'light'] as const)('measures the %s values the stylesheet declares', (scope) => {
    // The check lays an app's colors over these, so a value that drifted
    // from the stylesheet would measure a palette nobody ships.
    const sheet = declared(scope);
    for (const [token, value] of Object.entries(KIT_PALETTES[scope])) {
      expect(sheet[token], `--color-${token}`).toBe(value);
    }
  });

  it('mixes the tint and the band at the shares the stylesheet declares', () => {
    const share = (token: string) =>
      Number(
        new RegExp(
          `--color-${token}: color-mix\\(in srgb, var\\(--color-brand\\) (\\d+)%, var\\(--color-surface\\)\\);`,
        ).exec(css)?.[1],
      ) / 100;
    expect(share('tint')).toBe(TINT_SHARE);
    expect(share('band')).toBe(BAND_SHARE);
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

  it("passes the kit's own palettes", () => {
    expect(checkPalette()).toEqual([]);
  });

  it('reports a light brand that reads only on dark', () => {
    const problems = checkPalette({ light: { brand: '#00d4ff' } });
    expect(problems.every((p) => p.theme === 'light')).toBe(true);
    expect(problems).toContainEqual({
      theme: 'light',
      use: 'focus ring',
      foreground: 'brand',
      background: 'surface',
      ratio: 1.77,
      minimum: 3,
    });
    expect(problems.map((p) => p.use)).toEqual(
      expect.arrayContaining(['text', 'badge', 'button label', 'current row', 'head row']),
    );
  });

  it('catches the pairs a palette written by eye misses', () => {
    // The brand reads on every bare ground. It fails only inside its own
    // badge on a hovered row, and the hovered fill under the button's label.
    expect(checkPalette({ light: { brand: '#c2185b', 'brand-light': '#e91e63' } })).toEqual([
      {
        theme: 'light',
        use: 'badge',
        foreground: 'brand',
        background: 'brand at 10% over surface-2',
        ratio: 4.08,
        minimum: 4.5,
      },
      {
        theme: 'light',
        use: 'button label',
        foreground: 'ink',
        background: 'brand-light',
        ratio: 4.05,
        minimum: 4.5,
      },
    ]);
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

  it('refuses a token it does not read rather than ignoring it', () => {
    const misspelled = { 'brand-ligth': '#5fd9f4' } as unknown as Partial<Palette>;
    expect(() => checkPalette({ dark: misspelled })).toThrow('brand-ligth is not a token');
  });
});
