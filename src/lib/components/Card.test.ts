import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Card from './Card.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Card', () => {
  it('renders its children', () => {
    const { getByText } = render(Card, { props: { children: text('Body') } });
    expect(getByText('Body')).toBeTruthy();
  });

  it('renders a title and description header', () => {
    const { container, getByText } = render(Card, {
      props: { children: text('x'), title: 'Settings', description: 'Manage account' },
    });
    expect(container.querySelector('h3')?.textContent).toBe('Settings');
    expect(getByText('Manage account')).toBeTruthy();
  });

  it('applies the md padding by default and sm when requested', () => {
    const md = render(Card, { props: { children: text('x') } });
    expect(md.container.querySelector('.p-5')).toBeTruthy();
    const sm = render(Card, { props: { children: text('x'), pad: 'sm' } });
    expect(sm.container.querySelector('.p-4')).toBeTruthy();
  });

  it('renders header and footer snippets', () => {
    const { getByText } = render(Card, {
      props: { children: text('body'), header: text('HEAD'), footer: text('FOOT') },
    });
    expect(getByText('HEAD')).toBeTruthy();
    expect(getByText('FOOT')).toBeTruthy();
  });

  it('becomes a clickable button and fires onclick', async () => {
    const onclick = vi.fn();
    const { container } = render(Card, { props: { children: text('x'), onclick } });
    const clickable = container.querySelector('[role="button"]') as HTMLElement;
    expect(clickable).toBeTruthy();
    expect(clickable.className).toContain('cursor-pointer');
    await fireEvent.click(clickable);
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('activates on Enter and Space when it is clickable', async () => {
    // The card takes role="button" and tabindex from onclick alone, so it
    // entered the tab order and then ignored the two keys a button answers to.
    const onclick = vi.fn();
    const { container } = render(Card, { props: { onclick, children: text('body') } });
    const card = container.querySelector('[role="button"]') as HTMLElement;

    await fireEvent.keyDown(card, { key: 'Enter' });
    expect(onclick).toHaveBeenCalledTimes(1);

    await fireEvent.keyDown(card, { key: ' ' });
    expect(onclick).toHaveBeenCalledTimes(2);

    await fireEvent.keyDown(card, { key: 'a' });
    expect(onclick).toHaveBeenCalledTimes(2);
  });

  it('still forwards a keydown the page supplied', async () => {
    const onclick = vi.fn();
    const onkeydown = vi.fn();
    const { container } = render(Card, {
      props: { onclick, onkeydown, children: text('body') },
    });
    const card = container.querySelector('[role="button"]') as HTMLElement;
    await fireEvent.keyDown(card, { key: 'Escape' });
    expect(onkeydown).toHaveBeenCalledTimes(1);
  });
});
