import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, hydrate, unmount } from 'svelte';
import SameLabelFields from '../../../tests/fixtures/SameLabelFields.svelte';

// The server markup comes from a fixture that field-ids.ssr.test.ts keeps
// equal to the real server render.
const SERVER_HTML = readFileSync(resolve('tests/fixtures/same-label-fields-ssr.html'), 'utf8');

/** Every id, for and aria-describedby on the page, in document order. */
function idrefs(): string[] {
  return [...document.querySelectorAll('[id], [for], [aria-describedby]')].map((el) =>
    ['id', 'for', 'aria-describedby'].map((name) => el.getAttribute(name) ?? '').join('|'),
  );
}

let app: Record<string, unknown> | undefined;
afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('fields that share a label, hydrating over the server render', () => {
  it('keep the ids the server gave them', () => {
    document.body.innerHTML = SERVER_HTML;
    const before = idrefs();
    const warn = vi.spyOn(console, 'warn');

    app = hydrate(SameLabelFields, { target: document.body });
    flushSync();

    expect(idrefs()).toEqual(before);
    expect(warn).not.toHaveBeenCalled();
    for (const label of document.querySelectorAll('label')) {
      const field = label.closest('[data-field]') as HTMLElement;
      expect(field.contains(document.getElementById(label.htmlFor))).toBe(true);
    }
  });
});
