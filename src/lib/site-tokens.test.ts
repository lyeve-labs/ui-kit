import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sectionHeading } from './internal/layout.js';

/**
 * A page drawn for visitors sets a radius, a spacing step, a heading face and
 * a second color on its root and the components follow. Each rung is written
 * in terms of md, so a rung declared as a fixed length would stay put while
 * the rest of the scale moved. The consoles set none of them and must draw
 * exactly as before.
 */

const css = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** The value declared for a token in the `@theme` block, whitespace folded. */
function token(name: string): string {
  const theme = css.slice(css.indexOf('@theme'));
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(theme);
  if (!match) throw new Error(`theme.css declares no ${name}`);
  return match[1].replace(/\s+/g, ' ').trim();
}

/** The factor a token multiplies `base` by, or null when it is not one. */
function factor(name: string, base: string): number | null {
  const match = new RegExp(`^calc\\(var\\(${base}\\) \\* ([0-9.]+)\\)$`).exec(token(name));
  return match ? Number(match[1]) : null;
}

describe('the radius scale', () => {
  it('draws every rung at the px the consoles had before it moved to one value', () => {
    expect(token('--radius-md')).toBe('8px');
    const px = Object.fromEntries(
      ['xs', 'sm', 'lg', 'xl', '2xl', 'card'].map((rung) => [
        rung,
        (factor(`--radius-${rung}`, '--radius-md') ?? NaN) * 8,
      ]),
    );
    expect(px).toEqual({ xs: 4, sm: 6, lg: 12, xl: 16, '2xl': 24, card: 20 });
  });
});

describe('the heading face', () => {
  it('is the body face until a site sets its own', () => {
    expect(token('--font-heading')).toBe('var(--font-sans)');
  });

  it('draws both heading levels and leaves the eyebrow, a label, in the body face', () => {
    expect(sectionHeading(2).split(' ')).toContain('font-heading');
    expect(sectionHeading(3).split(' ')).toContain('font-heading');
    expect(sectionHeading(2, 'eyebrow').split(' ')).not.toContain('font-heading');
  });
});

describe('the site spacing scale', () => {
  it('sets four steps from md, at a quarter, a half, two and four times it', () => {
    expect(token('--spacing-site-md')).toBe('1rem');
    const steps = Object.fromEntries(
      ['xs', 'sm', 'lg', 'xl'].map((step) => [
        step,
        factor(`--spacing-site-${step}`, '--spacing-site-md'),
      ]),
    );
    expect(steps).toEqual({ xs: 0.25, sm: 0.5, lg: 2, xl: 4 });
  });
});

describe('the second color', () => {
  it('follows violet, so it takes violet in every palette a site does not set it in', () => {
    expect(token('--color-brand-2')).toBe('var(--color-violet)');
  });
});
