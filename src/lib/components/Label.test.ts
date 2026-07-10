import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Label from './Label.svelte';

const text = (s: string) =>
  createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Label', () => {
  it('renders its children', () => {
    const { getByText } = render(Label, { props: { children: text('Username') } });
    expect(getByText('Username')).toBeTruthy();
  });

  it('sets the for attribute', () => {
    const { container } = render(Label, {
      props: { children: text('x'), for: 'field-1' },
    });
    expect(container.querySelector('label')?.getAttribute('for')).toBe('field-1');
  });

  it('renders a required marker', () => {
    const { container } = render(Label, {
      props: { children: text('x'), required: true },
    });
    expect(container.querySelector('span[aria-label="required"]')?.textContent).toBe('*');
  });

  it('renders a hint in parentheses', () => {
    const { getByText } = render(Label, {
      props: { children: text('x'), hint: 'optional' },
    });
    expect(getByText('(optional)')).toBeTruthy();
  });
});
