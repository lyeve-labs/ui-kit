import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The library drifted because nothing measured it. Every component was correct
 * on its own terms and wrong beside its neighbour: three focus treatments, two
 * wrapper gaps, two error-border opacities, two control heights, and icons
 * drawn as Unicode characters in some components and stroked SVG in others.
 *
 * These tests read the source rather than the rendered output, because the
 * defect is not what any single component does - it is the disagreement between
 * them. A rendering test would have to be written once per component and would
 * pass just as happily on the state that shipped.
 */

const COMPONENTS = join(__dirname, 'components');

function componentFiles(): { name: string; path: string; src: string }[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  return walk(COMPONENTS)
    .filter((p) => p.endsWith('.svelte'))
    .map((path) => ({
      name: path.slice(COMPONENTS.length + 1).replace(/\.svelte$/, ''),
      path,
      src: readFileSync(path, 'utf8'),
    }));
}

const files = componentFiles();

/** Controls a user types into or picks from. They share one visual contract. */
const FIELDS = [
  'Input',
  'Select',
  'Textarea',
  'NumberInput',
  'SearchInput',
  'FileInput',
  'Autocomplete',
  'MultiSelect',
  'DatePicker',
];

/**
 * Portalled overlays own the whole viewport, so `class` has no unambiguous
 * target on them. Everything else is placed by the consumer and must accept one.
 */
const PORTALLED = [
  'Drawer',
  'Modal',
  'Toaster',
  'dialog/Dialog',
  'dialog/DialogContainer',
  'dialog/ConfirmDialog',
];

describe('component consistency', () => {
  it('finds every component', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('draws icons as stroked SVG, never as a Unicode character', () => {
    // A literal × or ✓ renders at whatever weight the user's font gives it,
    // which sat visibly lighter than the SVG icons next to it.
    const offenders = files.filter((f) => /[×−✓ℹ]/.test(f.src)).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('states the control height as a token, not as a literal', () => {
    // h-9 (36px) against the 38px every other control resolved to is what made
    // a NumberInput sit two pixels short of the Input beside it.
    const offenders = files
      .filter((f) => /\bh-9\b|min-h-\[|\bh-\[2\.375rem\]/.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('gives every control one focus border, at full strength', () => {
    const offenders = files
      .filter((f) => /focus:border-brand\/|focus:border-danger\//.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it.each(FIELDS)('%s composes its classes from the shared field contract', (name) => {
    const f = files.find((x) => x.name === name);
    expect(f, `${name} not found`).toBeDefined();
    expect(f!.src).toContain("from '../internal/field.js'");
  });

  it.each(FIELDS)('%s spaces its label, control and message identically', (name) => {
    const src = files.find((x) => x.name === name)!.src;
    expect(src).toContain('FIELD_WRAP');
    expect(src).not.toMatch(/class="flex flex-col gap-1 /);
  });

  it.each(FIELDS)('%s offers a label and a hint', (name) => {
    const src = files.find((x) => x.name === name)!.src;
    expect(src, `${name} has no label prop`).toMatch(/label\??:\s*string/);
    // SearchInput is the one field with no message row: it has no error state
    // to report and no hint that a placeholder does not already carry.
    if (name !== 'SearchInput') {
      expect(src, `${name} has no hint prop`).toMatch(/hint\??:\s*string/);
    }
  });

  // MultiSelect and DatePicker open their list from a role="button" trigger,
  // which holds no value for aria-invalid to describe. Their error still
  // reaches a screen reader, through aria-describedby.
  it.each(FIELDS.filter((n) => !['SearchInput', 'MultiSelect', 'DatePicker'].includes(n)))(
    '%s announces its own error to a screen reader',
    (name) => {
      const src = files.find((x) => x.name === name)!.src;
      expect(src).toContain('aria-invalid');
    },
  );

  it.each(FIELDS.filter((n) => n !== 'SearchInput'))(
    '%s points at whichever message is on screen',
    (name) => {
      const src = files.find((x) => x.name === name)!.src;
      expect(src).toContain('describedBy(');
    },
  );

  it.each(FIELDS.filter((n) => n !== 'SearchInput'))(
    '%s shows an error instead of a hint, never both at once',
    (name) => {
      const src = files.find((x) => x.name === name)!.src;
      expect(src, `${name} stacks its hint under its error`).toContain('{:else if hint}');
    },
  );

  it('lets the consumer position anything that is not a portalled overlay', () => {
    const offenders = files
      .filter((f) => !PORTALLED.includes(f.name))
      .filter((f) => !/class:\s*(klass|cls)\b/.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('spells the label, hint and error classes in exactly one place', () => {
    // Six components repeated these literals. They agreed today; nothing made
    // them agree tomorrow, and the label class had already drifted once.
    // Scoped to labels and message rows. DatePicker's calendar heading uses the
    // same three utilities and is not a field label, so it is not in scope.
    const offenders = files
      .filter((f) =>
        /"text-xs text-(faint|danger)"|<(label|legend)[^>]*class="text-sm font-medium text-fg"/.test(
          f.src,
        ),
      )
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('names one duration for every colour transition', () => {
    // A bare `transition-colors` inherits Tailwind's default and reads the same,
    // but it means the value is not stated anywhere a designer can change it.
    const offenders = files
      .filter((f) => /transition-colors(?!\s+duration-)/.test(f.src.replace(/\s+/g, ' ')))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });
});

describe('tone vocabulary', () => {
  const ACCENT = ['neutral', 'brand', 'success', 'warn', 'danger', 'violet'];
  const STATUS = ['neutral', 'brand', 'success', 'warn', 'danger'];

  it.each(['Badge', 'Tag', 'Indicator', 'Progress'])('%s covers every accent tone', (name) => {
    const src = files.find((f) => f.name === name)!.src;
    for (const tone of ACCENT) {
      expect(src, `${name} has no ${tone} tone`).toMatch(new RegExp(`\\b${tone}:`));
    }
  });

  it.each(['Alert', 'Banner', 'Toaster'])('%s covers every status tone', (name) => {
    const src = files.find((f) => f.name === name)!.src;
    for (const tone of STATUS) {
      expect(src, `${name} has no ${tone} tone`).toMatch(new RegExp(`\\b${tone}:`));
    }
  });

  it('no component still spells the brand tone "info" in its own tone map', () => {
    const offenders = files.filter((f) => /^\s+info:/m.test(f.src)).map((f) => f.name);
    expect(offenders).toEqual([]);
  });
});

describe('the kit carries its own styles', () => {
  const theme = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');

  it('tells Tailwind to scan the built components', () => {
    // Without this the kit publishes tokens and no utility classes, and each
    // component renders only the parts its host app happens to use elsewhere.
    expect(theme).toMatch(/@source\s+['"]\.\.\/\.\.\/\.\.\/dist['"]/);
  });

  it('states the control height as a token', () => {
    expect(theme).toContain('--spacing-control:');
  });
});
