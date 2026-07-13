import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Kbd from './Kbd.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Kbd', () => {
  it('renders its children inside a <kbd> element', () => {
    const { container, getByText } = render(Kbd, { props: { children: text('Ctrl') } });
    expect(getByText('Ctrl')).toBeTruthy();
    expect(container.querySelector('kbd')).toBeTruthy();
  });
});
