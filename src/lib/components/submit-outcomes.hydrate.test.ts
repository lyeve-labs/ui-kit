import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, hydrate, unmount } from 'svelte';
import SubmitOutcomes from '../../../tests/fixtures/SubmitOutcomes.svelte';
import * as motion from '../motion.js';

vi.mock('../motion.js', async (original) => {
  const real = await original<typeof import('../motion.js')>();
  return { ...real, toast: vi.fn(real.toast) };
});

// submit-outcomes.ssr.test.ts keeps this fixture equal to the real server render.
const SERVER_HTML = readFileSync(resolve('tests/fixtures/submit-outcomes-ssr.html'), 'utf8');

const said = () =>
  [...document.querySelectorAll('[aria-live]')].map((region) => region.textContent?.trim());

const frame = () => new Promise((done) => requestAnimationFrame(done));

let app: Record<string, unknown> | undefined;
afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
});

describe('submit outcomes hydrating over the server render', () => {
  it('keep the text the server drew, and bring nothing in again', async () => {
    // Deferring the text announces a message the browser mounts. A message the
    // server drew is already on screen, and emptying it at hydration made the
    // text vanish and come back two frames later with an entrance.
    document.body.innerHTML = SERVER_HTML;
    const drawn = said();
    expect(drawn).toEqual(['Plan changed.', 'Webhook saved.', 'Settings saved.']);

    // A SvelteKit app hydrates with no intros.
    app = hydrate(SubmitOutcomes, { target: document.body, intro: false });
    flushSync();
    expect(said()).toEqual(drawn);
    vi.mocked(motion.toast).mockClear();
    await frame();
    await frame();
    flushSync();
    expect(said()).toEqual(drawn);
    // Nothing arrives again once the deferred fill would have run.
    expect(vi.mocked(motion.toast)).not.toHaveBeenCalled();
  });
});
