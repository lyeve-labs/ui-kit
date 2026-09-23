import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OverlaySize, PageWidth } from './layout.js';
import {
  APP_SIDEBAR,
  APP_SIDEBAR_RAIL,
  APP_SIDEBAR_WIDE,
  CARD_EMPTY,
  CARD_FOOTER,
  CARD_HEADER,
  CARD_PAD,
  CARD_SURFACE,
  MODAL_PAD,
  OVERLAY_WIDTH,
  PAGE_PAD,
  PAGE_STACK,
  PAGE_WIDTH,
  TABLE_CELL_BODY,
  TABLE_CELL_HEAD,
  fitOverlay,
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

/**
 * Every `--container-*` step the theme declares, in rem, which is what a
 * `max-w-*` class resolves through. Read out of the sheet rather than listed
 * here: a cap that names a token nobody declared generates no rule at all, and
 * the page would render against the window edge with nothing to show for it.
 */
const CONTAINER_REM: Record<string, number> = {
  ...Object.fromEntries(
    [...theme.matchAll(/--container-([a-z0-9-]+):\s*([0-9.]+)rem/g)].map((m): [string, number] => [
      m[1],
      Number(m[2]),
    ]),
  ),
  /** `max-w-full` is Tailwind's own, and it is the absence of a cap. */
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
  ...Object.entries(OVERLAY_WIDTH).map(([k, v]): [string, string] => [`OVERLAY_WIDTH.${k}`, v]),
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

describe('the overlay ladder', () => {
  const ORDER: OverlaySize[] = ['sm', 'md', 'lg', 'xl', 'full'];

  it('offers exactly the five named rungs', () => {
    expect(Object.keys(OVERLAY_WIDTH).sort()).toEqual([...ORDER].sort());
  });

  it.each(ORDER)('%s resolves to a container step the theme declares', (name) => {
    const m = /^max-w-([a-z0-9-]+)$/.exec(OVERLAY_WIDTH[name]);
    expect(m, `${name} is not a plain max-w class`).not.toBeNull();
    expect(CONTAINER_REM[m ? m[1] : '']).toBeDefined();
  });

  it('climbs, so a rung never gives less room than the one below it', () => {
    const rem = ORDER.map((k) => CONTAINER_REM[/^max-w-(.+)$/.exec(OVERLAY_WIDTH[k])![1]]);
    for (let i = 1; i < rem.length; i++) {
      expect(rem[i], `${ORDER[i]} is not wider than ${ORDER[i - 1]}`).toBeGreaterThan(rem[i - 1]);
    }
  });

  it('starts wider than every ladder it replaced', () => {
    // Modal 24rem, Drawer 18rem and the dialog stack 24rem were the three
    // bottom rungs. A ladder that is only re-lettered fixes nothing.
    const smallest = CONTAINER_REM[/^max-w-(.+)$/.exec(OVERLAY_WIDTH.sm)![1]];
    expect(smallest).toBeGreaterThan(24);
  });

  it('leaves the widest overlay narrower than the widest page', () => {
    // An overlay is something lifted off the page. One as wide as the page
    // under it is a navigation the user cannot see they are inside of.
    const widest = CONTAINER_REM[/^max-w-(.+)$/.exec(OVERLAY_WIDTH.full)![1]];
    const page = CONTAINER_REM[/^max-w-(.+)$/.exec(PAGE_WIDTH.wide)![1]];
    expect(widest).toBeLessThan(page);
  });
});

describe('the width a form earns', () => {
  it('keeps a short form in one column', () => {
    for (const n of [0, 1, 4]) expect(fitOverlay(n)).toBe('md');
  });

  it('widens past four fields, which is where a form starts pairing them', () => {
    for (const n of [5, 8]) expect(fitOverlay(n)).toBe('lg');
  });

  it('widens again past eight', () => {
    for (const n of [9, 30]) expect(fitOverlay(n)).toBe('xl');
  });

  it('never chooses a rung a docked panel cannot take', () => {
    // Drawer and Modal both exclude `full`, so a rule that returned it would
    // be a type error in one place and a silent no-op in the other.
    for (let n = 0; n <= 40; n++) expect(fitOverlay(n)).not.toBe('full');
  });

  it('never steps backwards as a form grows', () => {
    const rung = Object.keys(OVERLAY_WIDTH) as OverlaySize[];
    let last = -1;
    for (let n = 0; n <= 40; n++) {
      const at = rung.indexOf(fitOverlay(n));
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
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
    const m = /^max-w-([a-z0-9-]+)$/.exec(PAGE_WIDTH[name]);
    expect(m, `${name} is not a plain max-w class`).not.toBeNull();
    expect(CONTAINER_REM[m ? m[1] : '']).toBeDefined();
  });

  it('orders narrow, default, wide and full, widest last', () => {
    // A name that does not sort by width is worse than the raw class: a page
    // asking for wide and getting less room than default has no way to tell.
    const rem = ORDER.map((k) => {
      const m = /^max-w-([a-z0-9-]+)$/.exec(PAGE_WIDTH[k]);
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

/**
 * The rendered size of whichever font-size class a string carries, in pixels.
 *
 * Tailwind's own steps are its published defaults; the brand steps are read
 * out of theme.css, so a token whose value moves moves this test with it
 * rather than against a number copied into the assertion.
 */
const TAILWIND_TEXT_PX: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
};

function brandTextPx(): Record<string, number> {
  const css = readFileSync(join(__dirname, '../styles/theme.css'), 'utf8');
  const out: Record<string, number> = {};
  for (const [, name, value] of css.matchAll(/--text-([a-z0-9]+):\s*([0-9.]+)rem/g)) {
    out[`text-${name}`] = Number(value) * 16;
  }
  return out;
}

function pxOf(classes: string): number {
  const sizes = { ...TAILWIND_TEXT_PX, ...brandTextPx() };
  for (const token of classes.split(/\s+/)) {
    if (token in sizes) return sizes[token];
  }
  throw new Error(`no font-size class in "${classes}"`);
}

describe('section heading', () => {
  it('gives level 2 and level 3 different treatments', () => {
    // Fourteen class strings served this role. Two levels that render alike
    // are the same defect with a smaller surface.
    expect(sectionHeading(2)).not.toBe(sectionHeading(3));
  });

  it('sets level 2 above level 3', () => {
    // Measured in pixels rather than ranked by class name. The two levels are
    // no longer drawn from one vocabulary - level 2 sizes from the brand ramp
    // and level 3 from a Tailwind step - and a list of class names has no way
    // to compare across the two. It also silently ranked an unlisted class at
    // -1, which is below every real size, so a heading that stopped naming a
    // size at all would have passed as the smaller of the pair.
    expect(pxOf(sectionHeading(2))).toBeGreaterThan(pxOf(sectionHeading(3)));
  });

  it('takes level 2 from the brand ramp, with its leading and its tracking', () => {
    // Eighteen ramp tokens shipped and nothing referenced one. A --text-*
    // token sets font-size alone, so a component adopting the size and not the
    // ratio leaves the heading leading at whatever it inherits.
    const two = sectionHeading(2);
    expect(two).toContain('text-h3');
    expect(two).toContain('leading-h3');
    expect(two).toContain('tracking-h3');
    expect(pxOf(two)).toBe(22);
  });

  it.each([2, 3] as const)('level %i reads as a heading', (level) => {
    expect(sectionHeading(level)).toMatch(/\bfont-(?:medium|semibold|bold)\b/);
    expect(sectionHeading(level)).toContain('text-fg');
  });

  it('sits under the page title rather than competing with it', () => {
    // PageHeader draws the page title at text-h2 font-bold, which is 32px.
    // Stated as a measurement because the two now name different tokens and a
    // string comparison cannot tell 22px from 32px.
    expect(pxOf(sectionHeading(2))).toBeLessThan(32);
    expect(sectionHeading(2)).not.toContain('font-bold');
  });
});

describe('the sidebar between its two widths', () => {
  it('holds two widths and nothing that sets a third', () => {
    expect(APP_SIDEBAR_WIDE).toBe('w-sidebar');
    expect(APP_SIDEBAR_RAIL).toBe('w-nav-rail');
    expect(APP_SIDEBAR).not.toMatch(/\bw-/);
  });

  it('travels between them on the vocabulary, not in one frame', () => {
    // A disclosure opening sideways is the accordion's move, so it takes the
    // accordion's rung and curve. This was the most frequent state change in
    // the product and the only one that happened instantly.
    expect(APP_SIDEBAR).toContain('transition-[width]');
    expect(APP_SIDEBAR).toContain('duration-base');
    expect(APP_SIDEBAR).toContain('ease-move');
    // transition-all would animate the border and the background with it.
    expect(APP_SIDEBAR).not.toContain('transition-all');
  });
});
