import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Footer from './Footer.svelte';

const note = createRawSnippet(() => ({ render: () => '<p>Northwind Studio</p>' }));

describe('Footer', () => {
  it('draws its note, its links in a named landmark and a label with no address as text', () => {
    const { container, getByRole, getByText } = render(Footer, {
      props: { note, links: [{ label: 'Privacy', href: '/privacy' }, { label: 'Lisbon' }] },
    });
    expect(container.querySelector('footer p')?.textContent).toBe('Northwind Studio');
    const nav = getByRole('navigation', { name: 'Footer' });
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/privacy');
    expect(getByText('Lisbon').tagName).toBe('SPAN');
  });

  it("names each profile by its network and marks it as the site's own", () => {
    const { getByRole } = render(Footer, {
      props: {
        social: [
          { network: 'github', href: 'https://github.com/example' },
          { network: 'linkedin', href: 'https://www.linkedin.com/company/example' },
        ],
      },
    });
    const list = getByRole('list', { name: 'Social' });
    // WebKit drops the role of a list drawn without markers unless it is stated.
    expect(list.getAttribute('role')).toBe('list');
    const links = [...list.querySelectorAll('a')];
    expect(links.map((a) => a.textContent)).toEqual(['GitHub', 'LinkedIn']);
    expect(links.every((a) => a.getAttribute('rel') === 'me')).toBe(true);
  });

  it('takes another name for the list of profiles', () => {
    const { getByRole } = render(Footer, {
      props: {
        social: [{ network: 'github', href: 'https://github.com/example' }],
        socialLabel: 'Elsewhere',
      },
    });
    expect(getByRole('list', { name: 'Elsewhere' })).toBeTruthy();
  });

  it('draws no landmark or list it has nothing for', () => {
    const { container } = render(Footer, { props: {} });
    expect(container.querySelector('nav, ul')).toBeNull();
  });
});
