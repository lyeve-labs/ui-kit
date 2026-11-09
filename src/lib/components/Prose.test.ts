import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Prose from './Prose.svelte';

const markup = createRawSnippet(() => ({
  render: () => '<div><h2>Plans</h2><p>Pick one.</p></div>',
}));

describe('Prose', () => {
  it('draws the markup it holds', () => {
    const { container } = render(Prose, { props: { children: markup } });
    expect(container.querySelector('h2')?.textContent).toBe('Plans');
  });

  it('styles each element it may hold that carries no class of its own', () => {
    const { container } = render(Prose, { props: { children: markup } });
    const classes = container.firstElementChild!.className;
    for (const tag of ['h2', 'h3', 'ul', 'ol', 'a', 'blockquote', 'code', 'strong']) {
      expect(classes).toContain(`[&_${tag}:not([class])]:`);
    }
  });

  it('draws its headings in the site heading face', () => {
    const { container } = render(Prose, { props: { children: markup } });
    expect(container.firstElementChild!.className).toContain('[&_h2:not([class])]:font-heading');
    expect(container.firstElementChild!.className).toContain('[&_h3:not([class])]:font-heading');
  });
});
