import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import AuthShell from './AuthShell.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));
const body = snippet('<form data-testid="body"></form>');
const props = (extra: Record<string, unknown> = {}) =>
  ({ title: 'Sign in to your account', children: body, ...extra }) as never;

describe('AuthShell', () => {
  it('renders the title as the page heading and nothing else as one', () => {
    const { container } = render(AuthShell, { props: props() });
    const headings = container.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Sign in to your account');
  });

  it('gives every signed-out page the same heading treatment', () => {
    // Three consoles shipped three heading sizes on the same card at the same
    // width. The size belongs to the shell, not to the page.
    const first = render(AuthShell, { props: props({ title: 'A' }) });
    const second = render(AuthShell, { props: props({ title: 'B' }) });
    expect(first.container.querySelector('h1')!.className).toBe(
      second.container.querySelector('h1')!.className,
    );
  });

  it('carries the product lockup above the heading, as a link only when asked', () => {
    const mark = render(AuthShell, { props: props() });
    expect(mark.container.querySelector('svg')).toBeTruthy();
    expect(mark.getByText('LyEve')).toBeTruthy();
    expect(mark.container.querySelector('a')).toBeNull();

    const link = render(AuthShell, { props: props({ href: '/' }) });
    const a = link.container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/');
    expect(a.querySelector('svg')).toBeTruthy();
    expect(a.className).toContain('focus-visible:ring-2');
  });

  it('renders the children on the card surface', () => {
    const { getByTestId } = render(AuthShell, { props: props() });
    expect(getByTestId('body').closest('.bg-surface')).toBeTruthy();
  });

  it('renders a description only when it is given', () => {
    const without = render(AuthShell, { props: props() });
    expect(without.queryByText('Staff only.')).toBeNull();
    const withOne = render(AuthShell, { props: props({ description: 'Staff only.' }) });
    expect(withOne.getByText('Staff only.')).toBeTruthy();
  });

  it('owns the column width so a page never states one', () => {
    // The page has no shell around it, so the shell owns the gutter and the
    // column. A page that added its own is what drove the consoles apart.
    const form = render(AuthShell, { props: props() });
    const main = form.container.querySelector('main')!;
    expect(main.className).toContain('min-h-screen');
    expect(main.className).toContain('bg-ink');
    expect(main.querySelector('.max-w-md')).toBeTruthy();

    const wide = render(AuthShell, { props: props({ width: 'lg' }) });
    expect(wide.container.querySelector('.max-w-3xl')).toBeTruthy();
    expect(wide.container.querySelector('.max-w-md')).toBeNull();
  });

  it('places actions above the lockup and the footer under the card', () => {
    const { container, getByTestId } = render(AuthShell, {
      props: props({
        actions: snippet('<button data-testid="theme">theme</button>'),
        footer: snippet('<a data-testid="signup" href="/signup">Create an account</a>'),
      }),
    });
    const order = [...container.querySelectorAll('[data-testid], h1')].map(
      (el) => el.getAttribute('data-testid') ?? el.tagName.toLowerCase(),
    );
    expect(order).toEqual(['theme', 'h1', 'body', 'signup']);
    expect(getByTestId('signup').closest('p')!.className).toContain('text-center');
  });

  it('renders no action row and no footer when neither is given', () => {
    const { container } = render(AuthShell, { props: props() });
    expect(container.querySelector('main > div > div')!.className).toContain('text-center');
    expect(container.querySelectorAll('main > div > p').length).toBe(0);
  });
});
