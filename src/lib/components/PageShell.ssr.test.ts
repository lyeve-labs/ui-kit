// @vitest-environment node

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';
import DocumentTitleApp from '../../../tests/fixtures/DocumentTitleApp.svelte';
import PageShell from './PageShell.svelte';

/*
 * The test config resolves `svelte` to its browser build so components mount
 * in jsdom. Context lives in whichever build runs the render, and the browser
 * build refuses a server render outright, so this file loads the build a
 * server render uses.
 */
vi.mock('svelte', async () => {
  const entry = createRequire(import.meta.url).resolve('svelte');
  return import(join(dirname(entry), 'index-server.js'));
});

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('PageShell document title, rendered on the server', () => {
  it('sends the title in the head, so the tab reads right before the page hydrates', () => {
    const { head } = render(DocumentTitleApp, { props: { title: 'Users' } });
    expect(head).toContain('<title>Users | Acme</title>');
  });

  it('sends documentTitle in place of the title when the page gives one', () => {
    const { head, body } = render(DocumentTitleApp, {
      props: { title: 'Edit entry', documentTitle: 'Invoice 8841' },
    });
    expect(head).toContain('<title>Invoice 8841 | Acme</title>');
    expect(body).toContain('Edit entry');
  });

  it('sends no title while the app states no format', () => {
    const { head } = render(PageShell, {
      props: { title: 'Team', documentTitle: 'Not used', children: text('Body') },
    });
    expect(head).not.toContain('<title');
  });
});
