// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import PluginCart from './PluginCart.svelte';

/**
 * The server render is the whole page for a reader with no JavaScript, and it
 * is the only render where no effect runs. A cart seeded in an effect looked
 * right in every browser test and showed nothing to the reader who had just
 * filled one on the site before this.
 */
describe('PluginCart, rendered on the server', () => {
  const PLUGINS = [
    { sku: 'plugin-graphql', name: 'GraphQL', price_cents: 800 },
    { sku: 'plugin-audit', name: 'Audit', price_cents: 500 },
  ];

  it('carries a selection made on another surface', () => {
    const { body } = render(PluginCart, { props: { plugins: PLUGINS, initial: ['plugin-audit'] } });
    const box = body.slice(body.indexOf('value="plugin-audit"'));
    expect(box.slice(0, 300)).toContain('checked');
  });

  it('leaves the rest unchecked', () => {
    const { body } = render(PluginCart, { props: { plugins: PLUGINS, initial: ['plugin-audit'] } });
    const box = body.slice(body.indexOf('value="plugin-graphql"'));
    expect(box.slice(0, 300)).not.toContain('checked');
  });

  it('drops a capability the catalog no longer sells', () => {
    const { body } = render(PluginCart, {
      props: { plugins: PLUGINS, initial: ['plugin-retired'] },
    });
    expect(body).not.toContain('plugin-retired');
  });

  it('does not seed one the reader already pays for', () => {
    const { body } = render(PluginCart, {
      props: { plugins: PLUGINS, initial: ['plugin-audit'], held: ['plugin-audit'] },
    });
    expect(body).toContain('Already on your subscription');
  });
});
