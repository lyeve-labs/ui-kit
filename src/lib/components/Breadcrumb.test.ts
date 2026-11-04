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
    // outside the link's own edges. The link is a box around a truncating
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

describe('Breadcrumb href', () => {
  it('refuses an href a browser would run as script', () => {
    const hostile = ['vbscript:msgbox(1)', '  javascript:alert(1)', 'java\tscript:alert(1)'];
    const { getByText } = render(Breadcrumb, {
      props: {
        items: [...hostile.map((href, i) => ({ label: `Crumb ${i}`, href })), { label: 'Here' }],
      },
    });
    for (const i of hostile.keys()) {
      const crumb = getByText(`Crumb ${i}`);
      expect(crumb.closest('a')?.hasAttribute('href') ?? false).toBe(false);
    }
  });

  it('keeps a relative and an https href as given', () => {
    const { getByText } = render(Breadcrumb, {
      props: {
        items: [
          { label: 'Local', href: '/content/entries?page=2' },
          { label: 'Away', href: 'https://lyeve.com/docs' },
          { label: 'Here' },
        ],
      },
    });
    expect(getByText('Local').closest('a')?.getAttribute('href')).toBe('/content/entries?page=2');
    expect(getByText('Away').closest('a')?.getAttribute('href')).toBe('https://lyeve.com/docs');
  });
});
