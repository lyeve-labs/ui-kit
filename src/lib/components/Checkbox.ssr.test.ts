// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Checkbox from './Checkbox.svelte';

/**
 * Checkbox.hydrate.test.ts hydrates this fixture in a browser environment. A
 * test runs either as the server or as the browser, never both, so the server
 * half lives here and keeps the fixture equal to what the server renders.
 */
describe('Checkbox, rendered on the server', () => {
  it('matches the fixture the hydration test starts from', () => {
    const { body } = render(Checkbox, { props: { label: 'I accept the terms', name: 'terms', id: 'terms' } });
    const fixture = readFileSync(resolve('tests/fixtures/checkbox-ssr.html'), 'utf8');
    expect(body.trim()).toBe(fixture.trim());
  });
});
