import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Quote from './Quote.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Quote', () => {
  it('draws the quotation in a blockquote and who said it in the caption', () => {
    const { container } = render(Quote, {
      props: { source: 'A reader', children: text('It took an afternoon.') },
    });
    expect(container.querySelector('figure > blockquote > p')?.textContent).toBe(
      'It took an afternoon.',
    );
    expect(container.querySelector('figure > figcaption')?.textContent).toBe('A reader');
  });

  it('draws no caption without a source', () => {
    const { container } = render(Quote, { props: { children: text('x') } });
    expect(container.querySelector('figcaption')).toBeNull();
  });

  it('sets it off by a rule in the second color, on the side the text starts', () => {
    const { container } = render(Quote, { props: { children: text('x') } });
    expect(container.querySelector('figure')!.className).toMatch(/\bborder-s-4 border-brand-2\b/);
  });
});
