// @vitest-environment node

import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Tabs from './Tabs.svelte';

describe('Tabs, rendered on the server', () => {
  it('draws the underline under the chosen tab, where no script will measure it', () => {
    const { body } = render(Tabs, {
      props: {
        items: [
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
        ],
        active: 'two',
        onchange: () => {},
      },
    });
    const tabs = body.match(/<button[^>]*role="tab"[^>]*>/g) ?? [];
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).not.toContain('after:bg-accent');
    expect(tabs[1]).toContain('after:bg-accent');
    expect(body).not.toContain('style="transform');
  });
});
