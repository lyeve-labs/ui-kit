import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageWidth } from './layout.js';
import {
  CARD_EMPTY,
  CARD_FOOTER,
  CARD_HEADER,
  CARD_PAD,
  CARD_SURFACE,
  MODAL_PAD,
  PAGE_PAD,
  PAGE_STACK,
  PAGE_WIDTH,
  TABLE_CELL_BODY,
  TABLE_CELL_HEAD,
  sectionHeading,
} from './layout.js';

/**
 * These constants are only worth having if they are provably better than the
 * strings they replace. A page that reaches for an arbitrary value or a raw
 * palette colour gets the same drift back, one layer down, and a class built
 * from a runtime value generates no CSS rule at all while still reading as a
 * class in the source. The scale itself is read out of theme.css rather than
 * repeated here, so a token renamed or removed fails these tests instead of
 * silently resolving to nothing.
 */

const theme = readFileSync(join(__dirname, '../styles/theme.css'), 'utf8');

/** Every `--spacing-*` token the theme declares, in rem. */
const SPACING = new Map<string, number>(
  [...theme.matchAll(/--spacing-([a-z0-9-]+):\s*([0-9.]+)rem/g)].map((m): [string, number] => [
    m[1],
    Number(m[2]),
  ]),
);

/** Tailwind's container scale, which is what `max-w-*` reads from. */
const CONTAINER_REM: Record<string, number> = {
  xs: 20,
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
  '2xl': 42,
  '3xl': 48,
  '4xl': 56,
  '5xl': 64,
  '6xl': 72,
  '7xl': 80,
  full: Number.POSITIVE_INFINITY,
};

/** Every class string this module hands a component, flattened and named. */
const SURFACES: [string, string][] = [
  ['PAGE_PAD', PAGE_PAD],
  ['PAGE_STACK', PAGE_STACK],
  ['CARD_SURFACE', CARD_SURFACE],
  ['CARD_HEADER', CARD_HEADER],
  ['CARD_FOOTER', CARD_FOOTER],
  ['CARD_EMPTY', CARD_EMPTY],
  ['TABLE_CELL_HEAD', TABLE_CELL_HEAD],
  ['TABLE_CELL_BODY', TABLE_CELL_BODY],
  ['MODAL_PAD', MODAL_PAD],
  ...Object.entries(PAGE_WIDTH).map(([k, v]): [string, string] => [`PAGE_WIDTH.${k}`, v]),
  ...Object.entries(CARD_PAD).map(([k, v]): [string, string] => [`CARD_PAD.${k}`, v]),
  ['sectionHeading(2)', sectionHeading(2)],
  ['sectionHeading(3)', sectionHeading(3)],
];

describe('every layout constant stays inside the token scale', () => {
  it.each(SURFACES)('%s uses no arbitrary value', (_name, classes) => {
    // An arbitrary value is a measurement nobody can change from the theme, and
    // it is how the five content caps and nine card paddings arrived.
    expect(classes).not.toMatch(/\[[^\]]*\]/);
  });

  it.each(SURFACES)('%s uses no raw palette colour', (_name, classes) => {
    // The palette is four surfaces, three text weights and five tones. A
    // zinc-800 or a hex reads correctly in one theme and wrong in the other.
    expect(classes).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(classes).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke|outline|divide|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|purple|fuchsia|pink|rose|black|white)\b/,
    );
  });

  it.each(SURFACES)('%s spaces itself with a token, not a Tailwind number', (_name, classes) => {
    // p-5 and p-6 are the same measurements as p-card and p-page-x, and they
    // are what makes a token unused. An unused token is one nobody maintains.
    expect(classes).not.toMatch(/\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap)-\d/);
  });

  it.each(SURFACES)('%s names only spacing tokens the theme declares', (_name, classes) => {
    const used = classes
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((c) => {
        const m = /^(?:p|px|py|gap)-([a-z][a-z0-9-]*)$/.exec(c);
        return m ? [m[1]] : [];
      });
    for (const token of used) {
      expect(SPACING.has(token), `--spacing-${token} is not declared in theme.css`).toBe(true);
    }
  });

  it.each(SURFACES)('%s builds no class out of a runtime value', (_name, classes) => {
    // Tailwind matches whole class names in source text, so an interpolated
    // class generates no rule and fails silently while still looking present.
    expect(classes).not.toMatch(/[${}]/);
  });

  it.each(SURFACES)('%s draws no Unicode glyph', (_name, classes) => {
    // The multiplication sign, minus sign, check mark and information source
    // are rejected outright: they render at whatever weight the reader's font
    // gives them, beside stroked SVG that does not move.
    expect(classes).not.toMatch(/[\u00d7\u2212\u2713\u2139]/);
  });
});

describe('page frame', () => {
  const ORDER: PageWidth[] = ['narrow', 'default', 'wide', 'full'];

  it('offers exactly the four named widths', () => {
    expect(Object.keys(PAGE_WIDTH).sort()).toEqual([...ORDER].sort());
  });

  it('gives each width its own cap', () => {
    const values = ORDER.map((k) => PAGE_WIDTH[k]);
    expect(new Set(values).size).toBe(ORDER.length);
  });

  it.each(ORDER)('%s resolves to a container step', (name) => {
    const m = /^max-w-([a-z0-9]+)$/.exec(PAGE_WIDTH[name]);
    expect(m, `${name} is not a plain max-w class`).not.toBeNull();
    expect(CONTAINER_REM[m ? m[1] : '']).toBeDefined();
  });

  it('orders narrow, default, wide and full, widest last', () => {
    // A name that does not sort by width is worse than the raw class: a page
    // asking for wide and getting less room than default has no way to tell.
    const rem = ORDER.map((k) => {
      const m = /^max-w-([a-z0-9]+)$/.exec(PAGE_WIDTH[k]);
      return CONTAINER_REM[m ? m[1] : ''];
    });
    for (let i = 1; i < rem.length; i++) {
      expect(rem[i], `${ORDER[i]} is not wider than ${ORDER[i - 1]}`).toBeGreaterThan(rem[i - 1]);
    }
  });

  it('pads the page from the gutter tokens on both axes', () => {
    expect(PAGE_PAD).toContain('px-page-x');
    expect(PAGE_PAD).toContain('py-page-y');
  });

  it('renders a symmetric gutter', () => {
    // page-y was 2rem against page-x's 1.5rem, describing an asymmetric page
    // that nothing rendered.
    expect(SPACING.get('page-y')).toBe(SPACING.get('page-x'));
  });

  it('spaces sections from the section token', () => {
    expect(PAGE_STACK).toContain('gap-section');
    expect(PAGE_STACK).toMatch(/\bflex\b/);
    expect(SPACING.get('section')).toBe(2);
  });
});

describe('card surface', () => {
  it('leaves padding out of the surface', () => {
    // A card wrapping a table needs its children flush to the border.
    expect(CARD_SURFACE).not.toMatch(/\bp[xytrbl]?-/);
  });

  it('does not clip the focus ring of its own children', () => {
    // The ring sits 2px outside the element, so a clipping surface crops it to
    // whichever edge fits. That shipped on the accordion as a stray line.
    expect(CARD_SURFACE).not.toContain('overflow-hidden');
  });

  it('resolves md to the card token rather than a number', () => {
    expect(CARD_PAD.md).toBe('p-card');
    expect(SPACING.get('card')).toBe(1.25);
  });

  it('offers a padding ladder that grows', () => {
    const rem = (v: string): number => {
      if (v === '') return 0;
      const m = /^p-([a-z][a-z0-9-]*)$/.exec(v);
      expect(m, `${v} is not a single padding token`).not.toBeNull();
      return SPACING.get(m ? m[1] : '') ?? Number.NaN;
    };
    const steps = [CARD_PAD.none, CARD_PAD.sm, CARD_PAD.md, CARD_PAD.lg].map(rem);
    expect(steps).toEqual([0, 1, 1.25, 1.5]);
  });

  it('gives the header and the footer one inset and opposite rules', () => {
    // Card insets its header 16px down and its footer 12px down, and nothing
    // tells the two bands apart.
    expect(CARD_HEADER).toContain('border-b');
    expect(CARD_FOOTER).toContain('border-t');
    const inset = (v: string) =>
      v
        .split(/\s+/)
        .filter((c) => /^p[xy]-/.test(c))
        .sort();
    expect(inset(CARD_HEADER)).toEqual(inset(CARD_FOOTER));
  });

  it('reads an empty card as body copy, not as a warning', () => {
    expect(CARD_EMPTY).toContain('text-center');
    expect(CARD_EMPTY).toMatch(/\btext-muted\b/);
    expect(CARD_EMPTY).not.toMatch(/\btext-(?:danger|warn)\b/);
  });
});

describe('table cells', () => {
  const cells: [string, string][] = [
    ['head', TABLE_CELL_HEAD],
    ['body', TABLE_CELL_BODY],
  ];

  it.each(cells)('the %s cell pads from tokens', (_name, classes) => {
    expect(classes).toContain('px-card-sm');
    expect(classes).toContain('py-input-y');
  });

  it('runs the head and the body at one row rhythm', () => {
    // Four cell paddings were in use, so two tables on one page ran at
    // different row heights.
    const pad = (v: string) =>
      v
        .split(/\s+/)
        .filter((c) => /^p[xy]-/.test(c))
        .sort();
    expect(pad(TABLE_CELL_HEAD)).toEqual(pad(TABLE_CELL_BODY));
  });

  it('marks the head as a label and the body as data', () => {
    expect(TABLE_CELL_HEAD).toContain('uppercase');
    expect(TABLE_CELL_HEAD).toContain('text-faint');
    expect(TABLE_CELL_BODY).toContain('text-fg');
    expect(TABLE_CELL_BODY).not.toContain('uppercase');
  });
});

describe('modal surface', () => {
  it('insets a modal exactly as it insets a card band', () => {
    // Modal painted 20px and Dialog 24px on the same kind of surface, so a
    // dialog opened over a modal showed both at once.
    const inset = (v: string) =>
      v
        .split(/\s+/)
        .filter((c) => /^p[xy]-/.test(c))
        .sort();
    expect(inset(MODAL_PAD)).toEqual(inset(CARD_HEADER));
  });

  it('states the gutter as the card token, not as 24px', () => {
    // Dialog's 24px is the page gutter's step, not a panel's.
    expect(MODAL_PAD).toContain('px-card');
    expect(MODAL_PAD).not.toContain('px-page-x');
  });
});

describe('section heading', () => {
  it('gives level 2 and level 3 different treatments', () => {
    // Fourteen class strings served this role. Two levels that render alike
    // are the same defect with a smaller surface.
    expect(sectionHeading(2)).not.toBe(sectionHeading(3));
  });

  it('sets level 2 above level 3', () => {
    const size = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
    const rank = (v: string) => size.findIndex((s) => v.split(/\s+/).includes(s));
    expect(rank(sectionHeading(2))).toBeGreaterThan(rank(sectionHeading(3)));
  });

  it.each([2, 3] as const)('level %i reads as a heading', (level) => {
    expect(sectionHeading(level)).toMatch(/\bfont-(?:medium|semibold|bold)\b/);
    expect(sectionHeading(level)).toContain('text-fg');
  });

  it('sits under the page title rather than competing with it', () => {
    // PageHeader draws the page title at text-2xl font-bold.
    expect(sectionHeading(2)).not.toContain('text-2xl');
    expect(sectionHeading(2)).not.toContain('font-bold');
  });
});
