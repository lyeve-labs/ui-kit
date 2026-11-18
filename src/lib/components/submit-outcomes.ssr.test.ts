// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import SubmitOutcomes from '../../../tests/fixtures/SubmitOutcomes.svelte';

/**
 * submit-outcomes.hydrate.test.ts hydrates this fixture in a browser
 * environment. A test runs either as the server or as the browser, never
 * both, so the server half lives here and keeps the fixture equal to what the
 * server renders.
 */
describe('submit outcomes, rendered on the server', () => {
  it('matches the fixture the hydration test starts from', () => {
    const { body } = render(SubmitOutcomes);
    const fixture = readFileSync(resolve('tests/fixtures/submit-outcomes-ssr.html'), 'utf8');
    expect(body.trim()).toBe(fixture.trim());
  });
});
