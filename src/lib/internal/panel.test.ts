import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PANEL_EMPTY,
  PANEL_GROUP_LABEL,
  PANEL_LIST,
  PANEL_OPTION,
  PANEL_OPTION_ACTIVE,
  PANEL_OPTION_DISABLED,
  PANEL_OPTION_SELECTED,
  PANEL_SURFACE,
  panelOption,
} from './panel.js';

/**
 * These assertions are the guards the panel classes have to pass, restated
 * against the constants themselves. The consistency suite reads the .svelte
 * files, so a class string that moved into a .ts module leaves its scope; a
 * regression here would ship with the whole suite green.
 */

const CONSTANTS: [string, string][] = [
  ['PANEL_SURFACE', PANEL_SURFACE],
  ['PANEL_LIST', PANEL_LIST],
  ['PANEL_OPTION', PANEL_OPTION],
  ['PANEL_OPTION_ACTIVE', PANEL_OPTION_ACTIVE],
  ['PANEL_OPTION_SELECTED', PANEL_OPTION_SELECTED],
  ['PANEL_OPTION_DISABLED', PANEL_OPTION_DISABLED],
  ['PANEL_EMPTY', PANEL_EMPTY],
  ['PANEL_GROUP_LABEL', PANEL_GROUP_LABEL],
];

const tokens = (cls: string): string[] => cls.split(/\s+/).filter(Boolean);

const hasAll = (cls: string, part: string): boolean => {
  const present = new Set(tokens(cls));
  return tokens(part).every((t) => present.has(t));
};

const hasAny = (cls: string, part: string): boolean => {
  const present = new Set(tokens(cls));
  return tokens(part).some((t) => present.has(t));
};

/** Utilities that set the same property, minus their variant prefix. */
const bare = (cls: string): string[] => tokens(cls).filter((t) => !t.includes(':'));

describe('panel class strings', () => {
  it.each(CONSTANTS)('%s uses no arbitrary value', (_name, cls) => {
    // DatePicker sized its panel w-[17rem]. An arbitrary value answers to no
    // token, so changing the scale leaves it behind.
    expect(cls).not.toMatch(/\[[^\]]*\]/);
  });

  it.each(CONSTANTS)('%s builds no class out of a runtime value', (_name, cls) => {
    // Tailwind matches whole class names in source text. An interpolated class
    // matches no candidate, so it generates no rule and silently does nothing.
    expect(cls).not.toMatch(/[{}$]/);
  });

  it.each(CONSTANTS)('%s names no colour the palette does not own', (_name, cls) => {
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(cls).not.toMatch(
      /\b(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    );
  });

  it.each(CONSTANTS)('%s states a duration beside every transition', (_name, cls) => {
    // The shipped guard rejects a bare transition-colors, and a duration that
    // is merely somewhere in the string lands on whatever it follows.
    expect(cls).not.toMatch(/transition-colors(?!\s+duration-)/);
    const parts = tokens(cls);
    parts.forEach((t, i) => {
      if (t.startsWith('transition-')) {
        expect(parts[i + 1] ?? '', `${t} has no duration after it`).toMatch(/^duration-/);
      }
    });
  });
});

describe('the surface', () => {
  it('draws a boundary that clears 3:1', () => {
    // All four panels used border-line, which reads 1.25:1 and was the only
    // thing separating the panel from the content under it.
    expect(hasAll(PANEL_SURFACE, 'border-line-strong')).toBe(true);
    expect(PANEL_SURFACE).not.toMatch(/border-line(?!-strong)/);
  });

  it('leaves the width to the caller', () => {
    // w-full suits a listbox and min-w-36 a menu. Fixing one here would make
    // the calendar wrong.
    expect(bare(PANEL_SURFACE).filter((t) => /^(?:w|min-w|max-w)-/.test(t))).toEqual([]);
  });

  it('carries the resting text colour so a row overrides it once', () => {
    expect(hasAll(PANEL_SURFACE, 'text-fg')).toBe(true);
    expect(bare(PANEL_OPTION).filter((t) => /^text-(?:fg|brand|faint|muted)$/.test(t))).toEqual([]);
  });
});

describe('the scrolling region', () => {
  const theme = readFileSync(join(__dirname, '../styles/theme.css'), 'utf8');

  it('caps its height with a token, not with max-h-60', () => {
    expect(hasAll(PANEL_LIST, 'max-h-panel-max')).toBe(true);
    expect(PANEL_LIST).not.toContain('max-h-60');
  });

  it('has a token to resolve against', () => {
    // max-h-panel-max with no --spacing-panel-max generates no rule at all,
    // which reads as a panel that simply never scrolls.
    expect(theme).toMatch(/--spacing-control:[^\n]*\n\s*--spacing-panel-max:\s*15rem;/);
  });

  it('owns the scroll, so the surface does not', () => {
    // Autocomplete scrolled the surface and MultiSelect an inner region. On the
    // surface the sticky search field scrolls away with the options.
    expect(hasAll(PANEL_LIST, 'overflow-y-auto')).toBe(true);
    expect(PANEL_SURFACE).not.toContain('overflow');
  });
});

describe('panelOption', () => {
  const ROWS = [
    { active: false, selected: false, disabled: false },
    { active: true, selected: false, disabled: false },
    { active: false, selected: true, disabled: false },
    { active: true, selected: true, disabled: false },
    { active: false, selected: false, disabled: true },
    { active: true, selected: false, disabled: true },
    { active: false, selected: true, disabled: true },
    { active: true, selected: true, disabled: true },
  ];

  it.each(ROWS)(
    'active=$active selected=$selected disabled=$disabled',
    ({ active, selected, disabled }) => {
      const out = panelOption({ active, selected, disabled });

      expect(hasAll(out, PANEL_OPTION), 'every row keeps the shared base').toBe(true);
      expect(hasAll(out, PANEL_OPTION_SELECTED)).toBe(selected);
      expect(hasAny(out, PANEL_OPTION_SELECTED)).toBe(selected);
      expect(hasAll(out, PANEL_OPTION_DISABLED)).toBe(disabled);
      expect(hasAny(out, PANEL_OPTION_DISABLED)).toBe(disabled);
      expect(hasAll(out, PANEL_OPTION_ACTIVE)).toBe(active && !disabled);
      expect(hasAny(out, PANEL_OPTION_ACTIVE)).toBe(active && !disabled);
    },
  );

  it('never paints a disabled row as the active descendant', () => {
    // Arrowing past a disabled row leaves it active. Ringing it says Enter will
    // choose it, and Enter will not.
    const out = panelOption({ active: true, selected: false, disabled: true });
    expect(tokens(out)).not.toContain('ring-1');
    expect(tokens(out)).not.toContain('bg-surface-2');
    expect(tokens(out)).toContain('pointer-events-none');
  });

  it('keeps a selected row selected after it is disabled', () => {
    const out = panelOption({ active: false, selected: true, disabled: true });
    expect(tokens(out)).toContain('text-brand');
  });

  it.each(ROWS)(
    'gives one utility per property at active=$active selected=$selected disabled=$disabled',
    ({ active, selected, disabled }) => {
      // Two utilities for one property resolve in the order Tailwind emits
      // them, not the order they were written, so the loser is unpredictable.
      const out = panelOption({ active, selected, disabled });
      expect(new Set(tokens(out)).size, 'a class is repeated').toBe(tokens(out).length);
      expect(bare(out).filter((t) => /^bg-/.test(t)).length).toBeLessThanOrEqual(1);
      expect(
        bare(out).filter((t) => /^text-(?:fg|brand|faint|muted|danger|warn|success)$/.test(t))
          .length,
      ).toBeLessThanOrEqual(1);
    },
  );
});
