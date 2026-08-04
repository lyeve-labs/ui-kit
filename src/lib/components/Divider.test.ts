import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Divider from './Divider.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Divider', () => {
  it('renders a plain <hr> when it has no children', () => {
    const { container } = render(Divider, { props: {} });
    expect(container.querySelector('hr')).toBeTruthy();
  });

  it('renders labelled content instead of an <hr> when given children', () => {
    const { container, getByText } = render(Divider, { props: { children: text('OR') } });
    expect(getByText('OR')).toBeTruthy();
    expect(container.querySelector('hr')).toBeNull();
  });
});
