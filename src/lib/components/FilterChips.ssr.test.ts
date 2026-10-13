// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FilterChips from './FilterChips.svelte';

/**
 * The server render is the whole row for a reader whose page has not hydrated
 * yet, and the only render where no script runs at all. A filter kept in the
 * URL is only a working filter if this markup already navigates.
 */
describe('FilterChips, rendered on the server', () => {
  const links = [
    { value: 'all', label: 'All', href: '?status=all' },
    { value: 'open', label: 'Open', href: '?status=open' },
  ];

  it('renders link chips as anchors that already carry their hrefs', () => {
    const { body } = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open' },
    });
    expect(body).toContain('href="?status=all"');
    expect(body).toContain('href="?status=open"');
    expect(body).not.toContain('<button');
  });

  it('marks the current chip before any script runs', () => {
    const { body } = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open' },
    });
    const current = (body.match(/<a\b[^>]*>/g) ?? []).filter((tag) =>
      tag.includes('aria-current="page"'),
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="?status=open"');
  });
});
