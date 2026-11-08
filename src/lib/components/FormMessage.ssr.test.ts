// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Alert from './Alert.svelte';
import FormMessage from './FormMessage.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/**
 * $effect does not run on the server, so a message that only ever filled its
 * region from an effect would reach a page with no client bundle empty, and
 * the outcome of the submit would be lost.
 */
describe('a submit outcome, rendered on the server', () => {
  it('carries the FormMessage text', () => {
    const { body } = render(FormMessage, { props: { children: text('Could not save') } });
    expect(body).toContain('Could not save');
  });

  it('carries the text of an Alert that clears itself', () => {
    const { body } = render(Alert, {
      props: { tone: 'success', autoDismiss: true, children: text('Webhook saved.') },
    });
    expect(body).toContain('Webhook saved.');
  });
});
