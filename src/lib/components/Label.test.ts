import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Label from './Label.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

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

  it('renders a required marker the name computation skips', () => {
    // Label is placed beside a control it does not own, so it cannot set the
    // attribute itself and the caller has to. What it can do is stay out of the
    // name: the marker used to carry aria-label="required", and a label's whole
    // subtree feeds the name of whatever it points at, so every control a Label
    // named announced the word as part of its name.
    const { container } = render(Label, {
      props: { children: text('x'), required: true },
    });
    // By its text, not by its position: the children snippet renders a span of
    // its own, and picking the first one would assert against that instead.
    const marker = Array.from(container.querySelectorAll('label span')).find(
      (el) => el.textContent === '*',
    ) as HTMLElement;
    expect(marker).toBeTruthy();
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('renders a hint in parentheses', () => {
    const { getByText } = render(Label, {
      props: { children: text('x'), hint: 'optional' },
    });
    expect(getByText('(optional)')).toBeTruthy();
  });
});
