import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A page that runs no script names data-theme="system", and a media query in
 * the stylesheet gives it the light palette under a light operating system.
 * CSS cannot put a media query into a selector, so that palette is declared a
 * second time beside Soft Light. A color changed in one and not the other
 * paints two different light themes, and only the pages that follow the
 * operating system show the stale one.
 */

const css = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** The body of the first block that opens after `marker`. */
function block(source: string, marker: string): string {
  const at = source.indexOf(marker);
  if (at === -1) throw new Error(`theme.css has no ${marker}`);
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`the block after ${marker} never closes`);
}

/** Each declaration with its whitespace folded, in source order. */
function declarations(body: string): string[] {
  return body
    .split(';')
    .map((d) => d.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

describe('the scheme that follows the operating system', () => {
  it('declares exactly the light palette', () => {
    const light = declarations(block(css, "html[data-theme='light'] {"));
    const query = block(css, '@media (prefers-color-scheme: light)');
    const system = declarations(block(query, "html[data-theme='system'] {"));
    // Two empty blocks are equal too, and would prove nothing.
    expect(light.some((d) => d.startsWith('--color-ink:'))).toBe(true);
    expect(system).toEqual(light);
  });
});
