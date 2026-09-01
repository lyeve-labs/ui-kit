import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'svelte/compiler';

/**
 * A textarea's value is its content in HTML, so `<textarea>{value}</textarea>`
 * is the obvious way to write it and the wrong one. It compiles to a
 * `set_value` call in a plain template effect, and that effect runs once while
 * the page hydrates. Anything the visitor had already typed is overwritten with
 * the value the server rendered, which for an empty field is nothing.
 *
 * `bind:value` compiles to `bind_value`, which checks the element against its
 * `defaultValue` before the first write and adopts what it finds instead. That
 * check is the only thing standing between a slow client bundle and a lost
 * reply, and it comes from the directive rather than from the markup around it.
 *
 * A component author has no way to see that difference in the source, so the
 * rule is checked here rather than left to review.
 */
function offendersIn(source: string, path: string): string[] {
  const ast = parse(source, { modern: true, filename: path });
  const offenders: string[] = [];

  const bindsValue = (attributes: Array<{ type: string; name?: string }>): boolean =>
    attributes.some((a) => a.type === 'BindDirective' && a.name === 'value');

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as {
      type?: string;
      name?: string;
      attributes?: unknown;
      fragment?: { nodes?: Array<{ type?: string }> };
    };
    if (candidate.type === 'RegularElement' && candidate.name === 'textarea') {
      const attributes = (candidate.attributes ?? []) as Array<{ type: string; name?: string }>;
      const content = candidate.fragment?.nodes ?? [];
      if (content.some((n) => n.type === 'ExpressionTag')) {
        offenders.push(`${path}: <textarea> renders its value as content`);
      } else if (!bindsValue(attributes)) {
        offenders.push(`${path}: <textarea> does not bind its value`);
      }
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (
        value &&
        typeof value === 'object' &&
        typeof (value as { type?: unknown }).type === 'string'
      ) {
        walk(value);
      }
    }
  };

  walk((ast as { fragment: unknown }).fragment);
  return offenders;
}

function svelteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) svelteFiles(path, out);
    else if (entry.endsWith('.svelte')) out.push(path);
  }
  return out;
}

describe('a field the visitor types into before hydration', () => {
  it('keeps what was typed, because every textarea binds its value', () => {
    const offenders = svelteFiles('src').flatMap((path) =>
      offendersIn(readFileSync(path, 'utf8'), path),
    );

    expect(offenders).toEqual([]);
  });

  it('recognises both ways a textarea can drop it', () => {
    const asContent = '<textarea>{value}</textarea>';
    const asNothing = '<textarea name="body"></textarea>';
    const bound = '<textarea name="body" bind:value></textarea>';
    const boundToSomethingElse = '<textarea bind:value={draft}></textarea>';

    expect(offendersIn(asContent, 'content.svelte')).toHaveLength(1);
    expect(offendersIn(asNothing, 'nothing.svelte')).toHaveLength(1);
    expect(offendersIn(bound, 'bound.svelte')).toEqual([]);
    expect(offendersIn(boundToSomethingElse, 'other.svelte')).toEqual([]);
  });
});
