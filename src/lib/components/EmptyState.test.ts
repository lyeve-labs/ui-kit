import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('EmptyState', () => {
  it('renders the title as a heading', () => {
    const { container } = render(EmptyState, { props: { title: 'Nothing here yet' } });
    expect(container.querySelector('h3')?.textContent).toBe('Nothing here yet');
  });

  it('renders the description and icon', () => {
    const { getByText } = render(EmptyState, {
      props: { title: 'Empty', description: 'Create your first item', icon: '📭' },
    });
    expect(getByText('Create your first item')).toBeTruthy();
    expect(getByText('📭')).toBeTruthy();
  });

  it('renders an action snippet', () => {
    const { getByText } = render(EmptyState, {
      props: { title: 'Empty', action: text('New item') },
    });
    expect(getByText('New item')).toBeTruthy();
  });
});
