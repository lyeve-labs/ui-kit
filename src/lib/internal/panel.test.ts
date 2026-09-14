import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PANEL_ABOVE,
  PANEL_BELOW,
  PANEL_EMPTY,
  PANEL_GROUP_LABEL,
  PANEL_LIST,
  PANEL_OPTION,
  PANEL_OPTION_ACTIVE,
  PANEL_OPTION_DISABLED,
  PANEL_OPTION_SELECTED,
  PANEL_SURFACE,
  panelOption,
  placePanel,
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

  it('clips its rows to its rounded shape', () => {
    // A backstop for a caller's stray full-width child; the rows themselves
    // stay inside the frame by construction, see below.
    expect(hasAll(PANEL_SURFACE, 'overflow-hidden')).toBe(true);
    expect(hasAll(PANEL_SURFACE, 'rounded-xl')).toBe(true);
  });

  it('leaves the offset and the side to placePanel', () => {
    // mt-1 on the surface would survive a flip and push an upward panel down
    // into its own trigger. The action states top-full mt-1 or bottom-full
    // mb-1, and nothing else may.
    expect(bare(PANEL_SURFACE).filter((t) => /^(?:mt|mb|top|bottom)-/.test(t))).toEqual([]);
    expect(hasAll(PANEL_BELOW, 'top-full mt-1')).toBe(true);
    expect(hasAll(PANEL_ABOVE, 'bottom-full mb-1')).toBe(true);
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

describe('the rows inside the frame', () => {
  it('insets the rows so a ring never reaches the rounded corners', () => {
    // The ring on a full-width square row was cut at the panel's corners on
    // the first and last row, an arc that read unfinished.
    expect(hasAll(PANEL_LIST, 'px-1')).toBe(true);
    expect(hasAll(PANEL_OPTION, 'rounded-lg')).toBe(true);
    expect(hasAll(PANEL_OPTION_ACTIVE, 'ring-inset')).toBe(true);
  });

  it('keeps the heading and the empty line flush with row text', () => {
    // The list's inset moved the rows in. A heading at its old padding would
    // hang past the labels under it.
    const pad = (cls: string): string[] => bare(cls).filter((t) => /^px-/.test(t));
    expect(pad(PANEL_GROUP_LABEL)).toEqual(pad(PANEL_OPTION));
    expect(pad(PANEL_EMPTY)).toEqual(pad(PANEL_OPTION));
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
    // The surface clips; it never scrolls.
    expect(PANEL_SURFACE).not.toMatch(/overflow(?:-[xy])?-(?:auto|scroll)/);
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

describe('placePanel', () => {
  const rect = (top: number, bottom: number): DOMRect =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top }) as DOMRect;

  interface Fixture {
    clip: HTMLDivElement;
    anchor: HTMLDivElement;
    surface: HTMLDivElement;
    list: HTMLDivElement;
  }

  /**
   * A wrapper inside an optional scroller, holding a surface with a list, the
   * shape every control renders. jsdom lays nothing out, so every rect and
   * the panel's natural height are stated by the test.
   */
  function mount(opts: {
    anchor: [number, number];
    clip?: [number, number];
    natural: number;
    viewport?: number;
  }): Fixture {
    const clip = document.createElement('div');
    if (opts.clip !== undefined) {
      clip.style.overflowY = 'auto';
      clip.getBoundingClientRect = () => rect(opts.clip![0], opts.clip![1]);
    }
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () => rect(opts.anchor[0], opts.anchor[1]);
    const surface = document.createElement('div');
    surface.className = PANEL_SURFACE;
    Object.defineProperty(surface, 'scrollHeight', { get: () => opts.natural });
    const list = document.createElement('div');
    list.className = PANEL_LIST;
    list.setAttribute('data-panel-list', '');
    surface.append(list);
    anchor.append(surface);
    clip.append(anchor);
    document.body.append(clip);
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: opts.viewport ?? 800,
    });
    return { clip, anchor, surface, list };
  }

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('stays below when the panel fits there', () => {
    const f = mount({ anchor: [100, 140], natural: 200 });
    const action = placePanel(f.surface);
    expect(hasAll(f.surface.className, PANEL_BELOW)).toBe(true);
    expect(hasAny(f.surface.className, PANEL_ABOVE)).toBe(false);
    // 800 - 140 - 8
    expect(f.list.style.maxHeight).toBe('min(var(--spacing-panel-max), 652px)');
    action.destroy();
  });

  it('flips above when nothing fits below and the room above is larger', () => {
    const f = mount({ anchor: [700, 740], natural: 200 });
    const action = placePanel(f.surface);
    expect(hasAll(f.surface.className, PANEL_ABOVE)).toBe(true);
    expect(hasAny(f.surface.className, PANEL_BELOW)).toBe(false);
    // 700 - 0 - 8
    expect(f.list.style.maxHeight).toBe('min(var(--spacing-panel-max), 692px)');
    action.destroy();
  });

  it('stays below when it fits there even with more room above', () => {
    // Below is where a native select opens. Flipping for room alone would put
    // every list in the lower half of a page above its field.
    const f = mount({ anchor: [500, 540], natural: 200 });
    const action = placePanel(f.surface);
    expect(hasAll(f.surface.className, PANEL_BELOW)).toBe(true);
    action.destroy();
  });

  it('keeps the side with more room when neither fits', () => {
    const f = mount({ anchor: [300, 340], natural: 600 });
    const action = placePanel(f.surface);
    // 460 below, 292 above: below wins and the list is capped to it.
    expect(hasAll(f.surface.className, PANEL_BELOW)).toBe(true);
    expect(f.list.style.maxHeight).toBe('min(var(--spacing-panel-max), 452px)');
    action.destroy();
  });

  it('measures against a scrolling ancestor rather than the viewport', () => {
    // A modal body clips what floats past it. The window had room; the body
    // did not, and the panel opened into the part of it nobody could reach.
    const f = mount({ anchor: [400, 440], clip: [100, 500], natural: 200 });
    const action = placePanel(f.surface);
    expect(hasAll(f.surface.className, PANEL_ABOVE)).toBe(true);
    // 400 - 100 - 8
    expect(f.list.style.maxHeight).toBe('min(var(--spacing-panel-max), 292px)');
    action.destroy();
  });

  it('re-measures when the scrolling ancestor scrolls', () => {
    const f = mount({ anchor: [400, 440], clip: [100, 500], natural: 200 });
    const action = placePanel(f.surface);
    expect(hasAll(f.surface.className, PANEL_ABOVE)).toBe(true);

    f.anchor.getBoundingClientRect = () => rect(150, 190);
    f.clip.dispatchEvent(new Event('scroll'));
    expect(hasAll(f.surface.className, PANEL_BELOW)).toBe(true);
    expect(f.list.style.maxHeight).toBe('min(var(--spacing-panel-max), 302px)');
    action.destroy();
  });

  it('removes its listeners on destroy', () => {
    const f = mount({ anchor: [100, 140], clip: [0, 800], natural: 200 });
    const onClip = vi.spyOn(f.clip, 'removeEventListener');
    const onWindow = vi.spyOn(window, 'removeEventListener');
    const action = placePanel(f.surface);
    action.destroy();
    expect(onClip).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(onWindow).toHaveBeenCalledWith('resize', expect.any(Function));

    // Nothing listens any more, so a scroll leaves the classes as they were.
    f.surface.classList.remove(...PANEL_BELOW.split(' '));
    f.clip.dispatchEvent(new Event('scroll'));
    expect(hasAny(f.surface.className, PANEL_BELOW)).toBe(false);
  });

  it('does nothing without a window', () => {
    const f = mount({ anchor: [700, 740], natural: 200 });
    vi.stubGlobal('window', undefined);
    try {
      const action = placePanel(f.surface);
      expect(f.surface.className).toBe(PANEL_SURFACE);
      expect(f.list.style.maxHeight).toBe('');
      action.destroy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
