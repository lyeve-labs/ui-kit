import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A token in the wrong namespace is silent. Tailwind v4 does not warn, does not
 * fail the build and does not emit anything: the declaration lands in the
 * stylesheet as an ordinary custom property and the class the author expected
 * simply never matches.
 *
 * The seven brand type-scale tokens shipped as `--font-size-display` and its
 * six siblings. Tailwind reads font sizes from `--text-*`, so `text-display`,
 * `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-caption` and `text-mono`
 * were never real classes. A grep across every repo in the estate found zero
 * uses of any of the seven, which is what a class that has never worked looks
 * like from the outside: nobody reports it, they just write `text-4xl` instead
 * and the brand scale goes unused.
 *
 * `--font-size-*` is the trap worth naming. It nests inside the recognised
 * `--font-*` namespace, so a guard that only checked prefixes would have passed
 * the exact defect it was written to catch. Tailwind reserves the sub-namespace
 * and generates nothing at all for it, verified by compiling both spellings
 * through tailwindcss 4.3.3.
 *
 * Lives beside the other library-wide suites rather than inside styles/, which
 * is a published directory: `files` ships src/lib/styles wholesale for the
 * styles.css export, and its test exclusions only cover dist.
 */

const css = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');

/**
 * The namespaces Tailwind v4 turns into utilities.
 *
 * Deliberately narrower than everything Tailwind accepts. Tailwind also reads
 * `--opacity-*`, `--width-*`, `--border-color-*` and more, and none of them
 * belong in a design token file whose vocabulary is colour, space, type and
 * elevation. A token outside this list fails here so a person decides whether
 * to widen the list or fix the token, rather than shipping a name that quietly
 * does nothing.
 */
const RECOGNISED = [
  '--color-',
  '--spacing-',
  '--text-',
  '--font-',
  '--leading-',
  '--tracking-',
  '--radius-',
  '--shadow-',
  '--breakpoint-',
  '--container-',
  '--z-index-',
  '--ease-',
  '--animate-',
  '--blur-',
  '--perspective-',
  '--aspect-',
];

/**
 * Prefixes that sit inside a recognised namespace and still generate nothing.
 *
 * These are the CSS property names an author reaches for by instinct. Each one
 * passes a plain prefix check and produces no utility, so each has to be
 * rejected by name.
 */
const RESERVED = ['--font-size-'];

/**
 * Tokens that are read only through `var()` and are not meant to produce a
 * utility. Empty today. Anything added here needs a comment saying which rule
 * reads it, because the entry turns off the only check that would notice the
 * token is invisible.
 */
const VAR_ONLY: string[] = [];

/** The body of the `@theme` block, with comments removed. */
function themeBlock(source: string): string {
  const bare = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = bare.indexOf('@theme');
  if (start === -1) return '';
  const open = bare.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < bare.length; i += 1) {
    if (bare[i] === '{') depth += 1;
    else if (bare[i] === '}') {
      depth -= 1;
      if (depth === 0) return bare.slice(open + 1, i);
    }
  }
  return '';
}

/** Every custom property declared in the block, in source order. */
function declaredTokens(block: string): string[] {
  return [...block.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]);
}

const tokens = declaredTokens(themeBlock(css));

describe('theme token namespaces', () => {
  it('reads the @theme block', () => {
    // A parser that silently returns nothing passes every assertion below it.
    // The block holds tens of tokens, so a low count means the block moved or
    // its braces changed shape, not that the palette shrank.
    expect(tokens.length).toBeGreaterThan(40);
  });

  it('declares no token twice', () => {
    // Two declarations of one name resolve by source order, so the value a
    // component gets depends on which line an editor happened to add last.
    const seen = new Set<string>();
    const repeats = tokens.filter((t) => (seen.has(t) ? true : (seen.add(t), false)));
    expect(repeats).toEqual([]);
  });

  it('puts every token in a namespace Tailwind turns into a utility', () => {
    const stray = tokens
      .filter((t) => !VAR_ONLY.includes(t))
      .filter((t) => !RECOGNISED.some((prefix) => t.startsWith(prefix)));
    expect(
      stray,
      `these tokens generate no utility class. Rename them into one of ${RECOGNISED.join(' ')} ` +
        'or add them to VAR_ONLY with the rule that reads them.',
    ).toEqual([]);
  });

  it('puts no token in a reserved sub-namespace that generates nothing', () => {
    // --font-size-* is the case this guard was written for. It passes the
    // --font- prefix check and emits no rule.
    const stray = tokens.filter((t) => RESERVED.some((prefix) => t.startsWith(prefix)));
    expect(stray, 'a reserved prefix produces no utility however plausible it reads').toEqual([]);
  });
});

describe('brand type scale', () => {
  const STEPS = ['display', 'h1', 'h2', 'h3', 'body', 'caption', 'mono'];

  it.each(STEPS)('sizes %s from the --text-* namespace', (step) => {
    // font-size comes from --text-*, so `text-h1` is a class only while the
    // token is spelled --text-h1.
    expect(tokens).toContain(`--text-${step}`);
    expect(tokens).not.toContain(`--font-size-${step}`);
  });

  it.each(STEPS)('leads %s from the --leading-* namespace', (step) => {
    // line-height comes from --leading-*, which these already used.
    expect(tokens).toContain(`--leading-${step}`);
  });

  it.each(['display', 'h1', 'h2', 'h3'])('tracks %s from the --tracking-* namespace', (step) => {
    // letter-spacing comes from --tracking-*, which these already used. Body,
    // caption and mono track at 0 and declare nothing.
    expect(tokens).toContain(`--tracking-${step}`);
  });

  it('keeps the families on --font-, which is where font-family comes from', () => {
    // font-sans and font-mono are correct today and are the two utilities the
    // estate leans on hardest. Renaming them into --text-* would turn every
    // one of them into a size.
    expect(tokens).toContain('--font-sans');
    expect(tokens).toContain('--font-mono');
    expect(css).toMatch(/font-family:\s*var\(--font-sans\)/);
  });

  it('states each step as a size and not as a family', () => {
    // A size declared under --font-* renders as a font-family utility carrying
    // a length, which computes to nothing and inherits the parent face. `mono`
    // is excluded because it names both a real family and a real size: the
    // family is --font-mono and the size is --text-mono, and the two are
    // different tokens rather than one token in the wrong place.
    for (const step of STEPS.filter((s) => s !== 'mono')) {
      expect(tokens).not.toContain(`--font-${step}`);
    }
  });
});
