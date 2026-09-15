import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Breadcrumb from './Breadcrumb.svelte';

const items = [
  { label: 'Home', href: '/' },
  { label: 'Settings', href: '/settings' },
  { label: 'Profile' },
];

describe('Breadcrumb', () => {
  it('renders a link for intermediate items with an href', () => {
    const { container } = render(Breadcrumb, { props: { items } });
    const link = container.querySelector('a[href="/"]');
    expect(link?.textContent?.trim()).toBe('Home');
  });

  it('renders the last item as the current page, not a link', () => {
    const { container } = render(Breadcrumb, { props: { items } });
    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Profile');
    expect(current?.tagName).toBe('SPAN');
  });

  it('labels the nav for accessibility', () => {
    const { container } = render(Breadcrumb, { props: { items } });
    expect(container.querySelector('nav[aria-label="Breadcrumb"]')).toBeTruthy();
  });
});

describe('Breadcrumb on a phone', () => {
  it('truncates a long label inside the link rather than on it', () => {
    // `truncate` clips overflow, and the hit box a finger gets is drawn
    // outside the link's own edges; the link is a box around a truncating
    // span so the two do not fight.
    const { container } = render(Breadcrumb, {
      props: { items: [{ label: 'A very long section name', href: '/a' }, { label: 'Here' }] },
    });
    const link = container.querySelector('a') as HTMLElement;
    expect(link.className.split(/\s+/)).not.toContain('truncate');
    expect(link.className.split(/\s+/)).toContain('min-w-0');
    const label = link.firstElementChild as HTMLElement;
    expect(label.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-w-0', 'truncate']));
    expect(label.textContent?.trim()).toBe('A very long section name');
  });
});
