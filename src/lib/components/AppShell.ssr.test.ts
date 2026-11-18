// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AppShell from './AppShell.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const props = (collapsed: boolean) => ({
  section: 'Dashboard',
  nav: text('Nav'),
  children: text('Body'),
  collapsible: true,
  collapsed,
});

const asideTag = (body: string) => body.match(/<aside[^>]*>/)?.[0] ?? '';

describe('the AppShell sidebar, rendered on the server', () => {
  it('renders an open sidebar reachable, with nothing set to move', () => {
    const { body } = render(AppShell, { props: props(false) });
    const tag = asideTag(body);
    expect(tag).not.toContain('inert');
    expect(tag).toContain('w-sidebar');
    expect(tag).toContain('transition-none!');
  });

  it('renders a put away sidebar mounted, out of reach and hidden', () => {
    // So the first paint draws the shut state, and opening it travels from
    // there rather than mounting a column in one frame.
    const { body } = render(AppShell, { props: props(true) });
    const tag = asideTag(body);
    expect(tag).toContain('inert');
    expect(tag).toContain('aria-hidden="true"');
    expect(body).toContain('Nav');
  });
});
