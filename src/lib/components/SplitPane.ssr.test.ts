// @vitest-environment node

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';
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
});
