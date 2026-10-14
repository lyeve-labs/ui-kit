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

  it('keeps the title an h3 when no level is given', () => {
    const { container } = render(EmptyState, { props: { title: 'No keys' } });
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
    expect(container.querySelector('h3')?.className).toBe('text-base font-semibold text-fg');
  });

  it('renders the title as an h2 at level 2, in the same treatment', () => {
    const { getByRole, container } = render(EmptyState, {
      props: { title: 'No keys', level: 2 },
    });
    const heading = getByRole('heading', { level: 2, name: 'No keys' });
    expect(heading.className).toBe('text-base font-semibold text-fg');
    expect(container.querySelector('h3')).toBeNull();
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
