// @vitest-environment node

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SplitPane from './SplitPane.svelte';

// The test config resolves svelte to its browser build, whose snippets need a
// document, so this file loads the build a server render uses.
vi.mock('svelte', async () => {
  const entry = createRequire(import.meta.url).resolve('svelte');
  return import(join(dirname(entry), 'index-server.js'));
});

/**
 * The server has no storage, so the first paint is the default width and the
 * width a reader stored arrives with the script.
 */
describe('SplitPane, rendered on the server', () => {
  const body = createRawSnippet(() => ({ render: () => '<p>body</p>' }));

  it('renders at the default width without reading storage', () => {
    const { body: html } = render(SplitPane, {
      props: {
        storageKey: 'ssr-aside',
        label: 'Things',
        side: 'start',
        width: 320,
        children: body,
      },
    });
    expect(html).toContain('--panel-w:320px');
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-valuenow="320"');
  });

  // A server runtime can carry a localStorage global of its own, one store for
  // every request, so a server render must not read it at all.
  describe('with a localStorage global on the server', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    afterEach(() => {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    });

    it('never touches it', () => {
      let reads = 0;
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          reads += 1;
          return { getItem: () => '{"width":400,"locked":true}', setItem: () => {} };
        },
      });
      const { body: html } = render(SplitPane, {
        props: { storageKey: 'ssr-aside', label: 'Things', side: 'start', children: body },
      });
      expect(reads).toBe(0);
      expect(html).not.toContain('--panel-w:400px');
    });
  });
});
