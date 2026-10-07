import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, hydrate, unmount } from 'svelte';
import Checkbox from './Checkbox.svelte';

// The server markup comes from a fixture that Checkbox.ssr.test.ts keeps equal
// to the real server render. It lives outside src/lib so it never ships.
const SERVER_HTML = readFileSync(resolve('tests/fixtures/checkbox-ssr.html'), 'utf8');

let app: Record<string, unknown> | undefined;
afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
});

/**
 * A visitor can tick a box before the page finishes loading. The portal's
 * signup page then hydrated the terms box back to unticked, and its submit
 * button stayed disabled with the box visibly empty.
 */
describe('Checkbox, hydrating over a box the visitor already ticked', () => {
  it('keeps the tick and reports it as the value', () => {
    document.body.innerHTML = SERVER_HTML;
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    input.checked = true;

    let bound = false;
    const props = {
      label: 'I accept the terms',
      name: 'terms',
      id: 'terms',
      get checked() {
        return bound;
      },
      set checked(v: boolean) {
        bound = v;
      },
    };
    app = hydrate(Checkbox, { target: document.body, props });
    flushSync();

    expect(input.checked).toBe(true);
    expect(bound).toBe(true);
    expect(document.querySelector('input + span svg')).not.toBeNull();
  });

  it('leaves an untouched box unticked', () => {
    document.body.innerHTML = SERVER_HTML;
    const onchange = vi.fn();
    app = hydrate(Checkbox, { target: document.body, props: { label: 'I accept the terms', name: 'terms', id: 'terms', onchange } });
    flushSync();

    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(false);
    expect(document.querySelector('input + span svg')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });
});
