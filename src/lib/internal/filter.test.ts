import { describe, expect, it } from 'vitest';
import {
  applyFilter,
  defaultFilter,
  normalize,
  type FilterContext,
  type FilterFn,
} from './filter.js';

/**
 * The filter under test replaced an expression duplicated in MultiSelect and
 * Autocomplete, so the cases that matter are the ones that expression got wrong
 * and the ones a caller now relies on: an untouched list comes back by
 * identity, a disabled filter is honoured at any query, an accent on either
 * side of the comparison folds away, and the index a matcher is handed counts
 * the input rather than the results.
 *
 * Decomposed spellings are written as escapes. A combining mark is invisible in
 * a source file, and a test that means to compare two spellings of one word is
 * worthless if an editor has quietly made them the same bytes.
 */

/** Cafe with a precomposed e-acute, U+00E9. */
const CAFE_PRECOMPOSED = 'Café';
/** Cafe with a bare e and a combining acute, U+0065 U+0301. */
const CAFE_DECOMPOSED = 'Cafe\u0301';

interface Option {
  value: string;
  label: string;
  keywords?: readonly string[];
}

const CITIES: readonly Option[] = [
  { value: 'par', label: 'Paris' },
  { value: 'mtl', label: 'Montreal' },
  { value: 'zrh', label: 'Zurich', keywords: ['ZRH', 'Switzerland'] },
];

/** A context shaped the way applyFilter shapes one, for testing a matcher alone. */
function ctx(query: string, index = 0): FilterContext {
  return { query, needle: normalize(query), index };
}

describe('normalize', () => {
  it.each([
    ['plain', 'plain'],
    ['  Zurich  ', 'zurich'],
    ['PARIS', 'paris'],
  ])('trims and lowercases %j into %j', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it.each([
    [CAFE_PRECOMPOSED, 'cafe'],
    [CAFE_DECOMPOSED, 'cafe'],
    ['MONTRÉAL', 'montreal'],
    ['Zürich', 'zurich'],
    ['Genève', 'geneve'],
    ['Ångström', 'angstrom'],
  ])('folds the NFD diacritics in %j into %j', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it('folds a precomposed and a decomposed spelling to the same string', () => {
    // The two spellings are different strings and compare unequal, which is how
    // an option pasted from one source missed a query typed from another.
    expect(CAFE_PRECOMPOSED).not.toBe(CAFE_DECOMPOSED);
    expect(normalize(CAFE_PRECOMPOSED)).toBe(normalize(CAFE_DECOMPOSED));
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a tab and a newline', ' \t\n '],
    ['a non-breaking space', '\u00a0'],
    ['combining marks only', '\u0301\u0302\u0303'],
    ['whitespace around combining marks', '  \u0301\u0308  '],
  ])('folds %s to the empty string', (_name, input) => {
    expect(normalize(input)).toBe('');
  });
});

describe('defaultFilter', () => {
  it.each([
    ['the label itself', 'Zurich', true],
    ['a substring of the label', 'uri', true],
    ['a different case', 'ZURICH', true],
    ['an accented spelling of an unaccented label', 'Zürich', true],
    ['a word the option does not carry', 'paris', false],
  ])('matches %s', (_name, query, expected) => {
    expect(defaultFilter({ label: 'Zurich' }, ctx(query))).toBe(expected);
  });

  it('reads keywords when the option carries them', () => {
    const option: Option = { value: 'zrh', label: 'Zurich', keywords: ['ZRH', 'Switzerland'] };
    expect(defaultFilter(option, ctx('switz'))).toBe(true);
    expect(defaultFilter(option, ctx('zrh'))).toBe(true);
  });

  it('ignores keywords when the option has none', () => {
    // Every option that ships today is label-only, so this is the path the two
    // controls take and it has to answer exactly as the old expression did.
    expect(defaultFilter({ label: 'Zurich' }, ctx('switz'))).toBe(false);
    expect(defaultFilter({ label: 'Zurich', keywords: [] }, ctx('switz'))).toBe(false);
  });

  it('folds accents in a keyword as well as in a label', () => {
    const option: Option = { value: 'gva', label: 'Geneva', keywords: ['Genève'] };
    expect(defaultFilter(option, ctx('geneve'))).toBe(true);
  });

  it('keeps every option when the needle is empty', () => {
    expect(defaultFilter({ label: 'Zurich' }, ctx('   '))).toBe(true);
  });
});

describe('applyFilter', () => {
  it.each([
    ['an empty query', ''],
    ['a whitespace-only query', '   '],
    ['a query of combining marks only', '\u0301\u0302'],
  ])('returns the same array reference for %s', (_name, query) => {
    // Identity, not a copy: a caller compares references to decide whether
    // there is any narrowing to render.
    expect(applyFilter(CITIES, query)).toBe(CITIES);
  });

  it('returns the same array reference when filter is false, even for a non-empty query', () => {
    // A consumer whose list is already cut by a server query passes false. A
    // keystroke still in the box must not put local filtering back.
    expect(applyFilter(CITIES, 'par', false)).toBe(CITIES);
    expect(applyFilter(CITIES, 'nothing matches this', false)).toBe(CITIES);
  });

  it('never asks a matcher about an empty query', () => {
    let calls = 0;
    const counted: FilterFn<Option> = () => {
      calls++;
      return true;
    };
    expect(applyFilter(CITIES, '  ', counted)).toBe(CITIES);
    expect(calls).toBe(0);
  });

  it('returns a new array once it narrows anything', () => {
    const result = applyFilter(CITIES, 'par');
    expect(result).not.toBe(CITIES);
    expect(result).toEqual([CITIES[0]]);
  });

  it('keeps the input order', () => {
    expect(applyFilter(CITIES, 'r').map((o) => o.value)).toEqual(['par', 'mtl', 'zrh']);
  });

  it.each([
    ['an unaccented query against an accented label', 'montreal', 'Montréal'],
    ['an accented query against an unaccented label', 'montréal', 'Montreal'],
    ['a decomposed query against a precomposed label', 'montre\u0301al', 'Montréal'],
    ['a precomposed query against a decomposed label', 'montréal', 'Montre\u0301al'],
  ])('matches %s', (_name, query, label) => {
    const options: readonly Option[] = [{ value: 'mtl', label }];
    expect(applyFilter(options, query)).toHaveLength(1);
  });

  it('hands a matcher the raw query and the folded needle', () => {
    const seen: FilterContext[] = [];
    const record: FilterFn<Option> = (_option, c) => {
      seen.push(c);
      return true;
    };
    applyFilter(CITIES, '  ZüRich  ', record);
    expect(seen).toHaveLength(CITIES.length);
    for (const c of seen) {
      expect(c.query).toBe('  ZüRich  ');
      expect(c.needle).toBe('zurich');
    }
  });

  it('reports ctx.index as the position in the unfiltered array', () => {
    const options: readonly Option[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Alpine' },
    ];
    const fromSecond: FilterFn<Option> = (_option, c) => c.index >= 1;
    expect(applyFilter(options, 'a', fromSecond).map((o) => o.value)).toEqual(['b', 'c']);
  });

  it('holds ctx.index steady as the query narrows the list', () => {
    const options: readonly Option[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Alpine' },
    ];
    const seen = new Map<string, number>();
    const record: FilterFn<Option> = (option, c) => {
      seen.set(`${c.needle}:${option.value}`, c.index);
      return defaultFilter(option, c);
    };

    expect(applyFilter(options, 'a', record).map((o) => o.value)).toEqual(['a', 'b', 'c']);
    expect(applyFilter(options, 'alpi', record).map((o) => o.value)).toEqual(['c']);

    // Alpine is third in the input under both queries, though the second query
    // leaves it first in the output. An index taken from the results would
    // renumber every option on every keystroke.
    expect(seen.get('a:c')).toBe(2);
    expect(seen.get('alpi:c')).toBe(2);
    expect(seen.get('a:b')).toBe(1);
    expect(seen.get('alpi:b')).toBe(1);
  });

  it('uses the default matcher when no filter is given', () => {
    expect(applyFilter(CITIES, 'switz').map((o) => o.value)).toEqual(['zrh']);
    expect(applyFilter(CITIES, 'switz', undefined).map((o) => o.value)).toEqual(['zrh']);
  });

  it('lets a call site replace the default matcher outright', () => {
    // The default reads the label and the keywords. A consumer whose users know
    // the list by its codes supplies a matcher over value instead.
    const byValue: FilterFn<Option> = (option, c) => normalize(option.value).includes(c.needle);
    expect(applyFilter(CITIES, 'mtl', byValue).map((o) => o.value)).toEqual(['mtl']);
    expect(applyFilter(CITIES, 'Montreal', byValue)).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(applyFilter(CITIES, 'reykjavik')).toEqual([]);
  });

  it('handles an empty option list', () => {
    const empty: readonly Option[] = [];
    expect(applyFilter(empty, 'paris')).toEqual([]);
    expect(applyFilter(empty, '')).toBe(empty);
  });
});
