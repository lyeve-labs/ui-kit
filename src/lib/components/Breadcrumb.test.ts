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
