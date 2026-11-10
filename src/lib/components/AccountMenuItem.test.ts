import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { User } from '@lucide/svelte';
import AccountMenuItem from './AccountMenuItem.svelte';

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('AccountMenuItem', () => {
  it('renders a link when given an href', () => {
    const { container } = render(AccountMenuItem, {
      props: { href: '/account', children: label('My profile') },
    });
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/account');
    expect(container.querySelector('button')).toBeNull();
  });

  it('passes target and rel through, for a link that opens a tab of its own', () => {
    const { container } = render(AccountMenuItem, {
      props: {
        href: 'https://example.com/docs',
        target: '_blank',
        rel: 'noreferrer noopener',
        children: label('Docs'),
      },
    });
    const link = container.querySelector('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer noopener');
  });

  it('refuses an href a browser would run as script', () => {
    const { container } = render(AccountMenuItem, {
      props: { href: 'javascript:alert(1)', children: label('Bad') },
    });
    expect(container.querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('renders a plain button without an href', () => {
    const { getByRole } = render(AccountMenuItem, { props: { children: label('Shortcuts') } });
    expect(getByRole('button').getAttribute('type')).toBe('button');
  });

  it('posts the form around it as a submit', async () => {
    const form = document.createElement('form');
    const onsubmit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', onsubmit);
    document.body.appendChild(form);
    const { getByRole } = render(AccountMenuItem, {
      target: form,
      props: { type: 'submit', children: label('Sign out') },
    });
    await fireEvent.click(getByRole('button'));
    expect(onsubmit).toHaveBeenCalledOnce();
    form.remove();
  });

  it('draws the icon at 16px, hidden from the accessible name', () => {
    const { container, getByRole } = render(AccountMenuItem, {
      props: { icon: User, children: label('My profile') },
    });
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.closest('[aria-hidden="true"]')).toBeTruthy();
    expect(getByRole('button').textContent?.trim()).toBe('My profile');
  });

  it('shows a pending submit: disabled, busy, and a spinner in the icon slot', () => {
    // A second press while the first sign-out is in flight posts it twice.
    const { container, getByRole } = render(AccountMenuItem, {
      props: { type: 'submit', icon: User, loading: true, children: label('Sign out') },
    });
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute('class')).toContain('animate-spin');
    expect(svgs[0].getAttribute('width')).toBe('16');
  });

  it('is not busy at rest', () => {
    const { getByRole } = render(AccountMenuItem, { props: { children: label('Sign out') } });
    expect(getByRole('button').hasAttribute('aria-busy')).toBe(false);
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('rests with no border, shadow or fill, as a sidebar row does', () => {
    // Bordered full-width buttons drew each entry as a box of its own.
    for (const props of [{ href: '/a' }, {}]) {
      const { container, unmount } = render(AccountMenuItem, {
        props: { ...props, children: label('Row') },
      });
      const row = container.querySelector('a, button')!;
      const classes = row.className.split(/\s+/);
      expect(classes.filter((c) => /^(?:border|shadow|ring)(?:-|$)/.test(c))).toEqual([]);
      expect(classes.filter((c) => /^bg-/.test(c))).toEqual([]);
      expect(classes).toContain('text-muted');
      expect(classes).toContain('hover:bg-surface-2');
      expect(classes).toContain('active:bg-line');
      expect(classes).toContain('transition-colors');
      unmount();
    }
  });

  it('draws the inset focus ring where it turns the outline off', () => {
    const { getByRole } = render(AccountMenuItem, { props: { children: label('Row') } });
    const classes = getByRole('button').className.split(/\s+/);
    for (const c of [
      'outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-inset',
      'focus-visible:ring-focus',
    ]) {
      expect(classes).toContain(c);
    }
  });

  it('grows to 44px under a finger', () => {
    const { getByRole } = render(AccountMenuItem, { props: { children: label('Row') } });
    expect(getByRole('button').className).toContain('coarse:min-h-control');
  });
});
