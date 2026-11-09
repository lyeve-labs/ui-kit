// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AppShell from './AppShell.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const props = (panelOpen: boolean) => ({
  section: 'API keys',
  children: text('Body'),
  panel: text('Assistant body'),
  panelLabel: 'Assistant',
  panelOpen,
});

describe('the AppShell panel, rendered on the server', () => {
  it('renders nothing while the panel is closed', () => {
    const { body } = render(AppShell, { props: props(false) });
    expect(body).not.toContain('Assistant body');
    expect(body).not.toContain('app-panel"');
  });

  it('renders an open panel docked, hidden below lg until the browser places it', () => {
    const { body } = render(AppShell, { props: props(true) });
    expect(body).toContain('Assistant body');
    expect(body).toMatch(/class="relative hidden shrink-0 lg:flex"/);
    expect(body).not.toContain('role="dialog"');
  });
});
