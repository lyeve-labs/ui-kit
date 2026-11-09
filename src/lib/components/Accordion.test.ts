import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import AccordionItems from '../../../tests/fixtures/AccordionItems.svelte';
import Accordion from './Accordion.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const names = (root: ParentNode) =>
  [...root.querySelectorAll('details')].map((d) => d.getAttribute('name'));

describe('Accordion', () => {
  it('draws a bordered container by default', () => {
    const { container } = render(Accordion, { props: { children: text('x') } });
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain('rounded-xl');
    expect(wrap.className).toContain('border-line');
  });

  it('drops the border when flush=true', () => {
    const { container } = render(Accordion, { props: { children: text('x'), flush: true } });
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain('divide-y');
    expect(wrap.className).not.toContain('rounded-xl');
  });

  it('starts with every item shut', () => {
    const { container } = render(AccordionItems);
    const items = [...container.querySelectorAll('details')];
    expect(items).toHaveLength(2);
    expect(items.every((d) => !d.open)).toBe(true);
  });

  it('gives its items one name, so the browser closes the others when one opens', () => {
    const { container } = render(AccordionItems);
    const [first, second] = names(container);
    expect(first).toMatch(/^accordion-/);
    expect(second).toBe(first);
  });

  it('gives two accordions on one page different names', () => {
    const one = render(AccordionItems);
    const two = render(AccordionItems);
    expect(names(one.container)[0]).not.toBe(names(two.container)[0]);
  });

  it('leaves its items unnamed when several may stay open', () => {
    const { container } = render(AccordionItems, { props: { multiple: true } });
    expect(names(container)).toEqual([null, null]);
  });
});
