import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Accordion from './Accordion.svelte';

const text = (s: string) =>
  createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Accordion', () => {
  it('renders its children', () => {
    const { getByText } = render(Accordion, { props: { children: text('items') } });
    expect(getByText('items')).toBeTruthy();
  });

  it('draws a bordered container by default', () => {
    const { container } = render(Accordion, { props: { children: text('x') } });
    expect((container.firstElementChild as HTMLElement).className).toContain('rounded-xl');
    expect((container.firstElementChild as HTMLElement).className).toContain('border-line');
  });

  it('drops the border when flush=true', () => {
    const { container } = render(Accordion, { props: { children: text('x'), flush: true } });
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain('divide-y');
    expect(wrap.className).not.toContain('rounded-xl');
  });
});
