import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Dropdown from './Dropdown.svelte';

// The trigger is a snippet that receives { open, toggle }; a raw snippet can't
// invoke that callback, so these cover the rendered/closed state only.
const trigger = createRawSnippet(() => ({
  render: () => '<button>Open menu</button>',
}));

const items = [
  { label: 'Edit', onclick: vi.fn() },
  { label: 'Delete', variant: 'danger' as const, onclick: vi.fn() },
];

describe('Dropdown', () => {
  it('renders the trigger snippet', () => {
    const { getByText } = render(Dropdown, { props: { items, trigger } });
    expect(getByText('Open menu')).toBeTruthy();
  });

  it('keeps the menu closed initially', () => {
    const { container } = render(Dropdown, { props: { items, trigger } });
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it('merges an extra class onto the wrapper', () => {
    const { container } = render(Dropdown, {
      props: { items, trigger, class: 'w-fit' },
    });
    expect((container.firstElementChild as HTMLElement).className).toContain('w-fit');
  });
});
