import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, hydrate, tick, unmount } from 'svelte';
import AssistForm from '../../../tests/fixtures/AssistForm.svelte';
import { assistForms } from '../internal/assist.svelte.js';

// FormAssist.ssr.test.ts keeps this fixture equal to the real server render.
const SERVER_HTML = readFileSync(resolve('tests/fixtures/assist-form-ssr.html'), 'utf8');

/** Every id and id reference on the page, in document order. */
function idrefs(): string[] {
  const names = ['id', 'for', 'aria-describedby', 'aria-labelledby', 'aria-controls'];
  return [...document.querySelectorAll(names.map((n) => `[${n}]`).join(', '))].map((el) =>
    names.map((name) => el.getAttribute(name) ?? '').join('|'),
  );
}

let app: Record<string, unknown> | undefined;
afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('a FormAssist hydrating over the server render', () => {
  it('keeps every id the server gave, then lists the form and takes suggestions', async () => {
    document.body.innerHTML = SERVER_HTML;
    const before = idrefs();
    const warn = vi.spyOn(console, 'warn');

    app = hydrate(AssistForm, { target: document.body });
    flushSync();

    expect(idrefs()).toEqual(before);
    expect(warn).not.toHaveBeenCalled();
    expect(assistForms().map((f) => f.label)).toEqual(['New key']);

    const result = assistForms()[0].controller.suggest({ name: 'website-read' });
    expect(result.applied).toEqual(['name']);
    flushSync();
    await tick();
    const input = document.querySelector('input[name="name"]') as HTMLInputElement;
    expect(input.value).toBe('website-read');
  });
});
