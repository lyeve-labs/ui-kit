import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCount } from './number.js';

describe('formatCount', () => {
  it('groups a figure large enough to be misread', () => {
    expect(formatCount(4210)).toBe('4,210');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('leaves a small figure exactly as it was', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(51)).toBe('51');
    expect(formatCount(999)).toBe('999');
  });

  it('reads a figure that is not a number as zero', () => {
    // Intl spells infinity as a glyph and NaN as a word, and both would land in
    // a summary line that is otherwise ascii.
    expect(formatCount(Number.NaN)).toBe('0');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('0');
    expect(formatCount(Number.NEGATIVE_INFINITY)).toBe('0');
  });
});

describe('formatCount against the runtime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /*
   * Both halves of the decision in one place: the formatter is constructed once
   * for the module rather than once per call, and it is told which locale to
   * use rather than taking the host's. A server and the browser it renders into
   * can report different locales, and a figure that changes on hydration is the
   * defect this guards.
   */
  it('builds one formatter, and names the locale it builds it with', async () => {
    const real = Intl.NumberFormat;
    const built = vi.fn((locale?: string) => new real(locale));
    vi.stubGlobal('Intl', { ...Intl, NumberFormat: built });
    vi.resetModules();

    const fresh = await import('./number.js');
    expect(fresh.formatCount(4210)).toBe('4,210');
    fresh.formatCount(1);
    fresh.formatCount(2);

    expect(built).toHaveBeenCalledTimes(1);
    expect(built).toHaveBeenCalledWith('en-US');
  });
});
