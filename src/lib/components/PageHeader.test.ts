import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    const { container } = render(PageHeader, { props: { title: 'Dashboard' } });
    expect(container.querySelector('h1')?.textContent).toBe('Dashboard');
  });

  it('renders the description', () => {
    const { getByText } = render(PageHeader, {
      props: { title: 'Dashboard', description: 'Your overview' },
    });
    expect(getByText('Your overview')).toBeTruthy();
  });

  it('renders an actions snippet', () => {
    const { getByText } = render(PageHeader, {
      props: { title: 'Dashboard', actions: text('New') },
    });
    expect(getByText('New')).toBeTruthy();
  });
});
