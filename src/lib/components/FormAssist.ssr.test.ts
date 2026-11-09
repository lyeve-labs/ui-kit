// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import AssistForm from '../../../tests/fixtures/AssistForm.svelte';
import { assistForms } from '../internal/assist.svelte.js';

/**
 * FormAssist.hydrate.test.ts hydrates this fixture in a browser environment,
 * so the server half lives here and keeps the fixture equal to the server
 * render.
 */
describe('a FormAssist rendered on the server', () => {
  it('lists no form, because the list would be shared by every request', () => {
    render(AssistForm);
    expect(assistForms()).toEqual([]);
  });

  it('matches the fixture the hydration test starts from', () => {
    const { body } = render(AssistForm);
    const fixture = readFileSync(resolve('tests/fixtures/assist-form-ssr.html'), 'utf8');
    expect(body.trim()).toBe(fixture.trim());
  });
});
