import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavBar from './NavBar.svelte';

const logo = { src: '/logo.svg', alt: 'Northwind', width: 120, height: 32 };

describe('NavBar', () => {
  it('is a navigation landmark named Main unless it is named otherwise', () => {
    const main = render(NavBar, { props: { brand: 'Northwind' } });
    expect(main.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    const other = render(NavBar, { props: { brand: 'Northwind', label: 'Sections' } });
    expect(other.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
  });

  it('marks the current page and draws a link with no address as text', () => {
    const { container, getByText } = render(NavBar, {
      props: {
        links: [
          { label: 'Home', href: '/', current: true },
          { label: 'Work', href: '/work' },
          { label: 'Soon' },
        ],
      },
    });
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual(['page', null]);
    expect(getByText('Soon').tagName).toBe('SPAN');
  });

  it('leaves the logo unnamed beside the site name, which already says it', () => {
    const named = render(NavBar, {
      props: { brand: 'Northwind', logo },
    });
    expect(named.container.querySelector('img')!.getAttribute('alt')).toBe('');
    const alone = render(NavBar, { props: { logo } });
    expect(alone.container.querySelector('img')!.getAttribute('alt')).toBe('Northwind');
  });

  it('draws its call to action as a button link', () => {
    const { getByRole } = render(NavBar, {
      props: { action: { label: 'Contact', href: '/contact' } },
    });
    const link = getByRole('link', { name: 'Contact' });
    expect(link.getAttribute('href')).toBe('/contact');
    expect(link.className).toMatch(/\bbg-brand\b/);
  });
});
