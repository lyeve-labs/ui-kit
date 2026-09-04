import { Settings } from '@lucide/svelte';
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

  describe('heading', () => {
    it('renders a real heading element at level 3 by default', () => {
      // The seven hand-rolled section shells this replaces spelled the heading
      // as a styled div, which no heading query and no screen reader outline
      // can find.
      const { container } = render(Card, {
        props: { children: text('x'), heading: 'Danger zone' },
      });
      expect(container.querySelector('h3')?.textContent).toBe('Danger zone');
      expect(container.querySelector('h2')).toBeNull();
    });

    it('renders level 2 when the caller asks for it', () => {
      const { container } = render(Card, {
        props: { children: text('x'), heading: 'Danger zone', headingLevel: 2 },
      });
      expect(container.querySelector('h2')?.textContent).toBe('Danger zone');
      expect(container.querySelector('h3')).toBeNull();
    });

    it('takes its type treatment from the layout contract, not from a local string', () => {
      const three = render(Card, { props: { children: text('x'), heading: 'A' } });
      expect(three.container.querySelector('h3')?.className).toBe('text-sm font-semibold text-fg');
      const two = render(Card, {
        props: { children: text('x'), heading: 'A', headingLevel: 2 },
      });
      expect(two.container.querySelector('h2')?.className).toBe('text-lg font-semibold text-fg');
    });

    it('draws the icon and the meta row beside the heading', () => {
      const { container, getByText } = render(Card, {
        props: { children: text('x'), heading: 'Members', icon: Settings, meta: '12 seats' },
      });
      const band = container.querySelector('h3')?.parentElement as HTMLElement;
      expect(band.querySelector('svg')).toBeTruthy();
      expect(getByText('12 seats')).toBeTruthy();
      expect(band.contains(getByText('12 seats'))).toBe(true);
    });

    it('renders the description under the heading', () => {
      const { getByText } = render(Card, {
        props: { children: text('x'), heading: 'Members', description: 'Who can sign in' },
      });
      expect(getByText('Who can sign in')).toBeTruthy();
    });

    it('lets a header snippet win over a heading, and a heading over a title', () => {
      // Three ways into one band. The precedence is stated on the prop, and a
      // card that sets two of them has to resolve the same way every time.
      const both = render(Card, {
        props: { children: text('x'), header: text('SNIPPET'), heading: 'Heading' },
      });
      expect(both.getByText('SNIPPET')).toBeTruthy();
      expect(both.container.querySelector('h3')).toBeNull();

      const over = render(Card, {
        props: { children: text('x'), heading: 'Heading', title: 'Title' },
      });
      expect(over.container.querySelector('h3')?.textContent).toBe('Heading');
      expect(over.container.textContent).not.toContain('Title');
    });

    it('draws no header band at all when none of the three is set', () => {
      const { container } = render(Card, { props: { children: text('x') } });
      expect(container.querySelector('.border-b')).toBeNull();
    });
  });
});
