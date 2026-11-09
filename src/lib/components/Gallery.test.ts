import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Gallery from './Gallery.svelte';

const images = [
  { src: '/a.jpg', alt: 'The studio', caption: 'The studio.' },
  { src: '/b.jpg', alt: '' },
];

describe('Gallery', () => {
  it('crops every image to 4:3 so the tiles line up, with its caption under it', () => {
    const { container } = render(Gallery, { props: { images } });
    const tiles = [...container.querySelectorAll('img')];
    expect(tiles).toHaveLength(2);
    expect(tiles.every((img) => /\baspect-\[4\/3\]/.test(img.className))).toBe(true);
    expect(container.querySelector('figcaption')?.textContent).toBe('The studio.');
  });

  it('draws nothing without images', () => {
    const { container } = render(Gallery, { props: { images: [], layout: 'row' } });
    expect(container.querySelector('ul')).toBeNull();
  });

  it('leaves a grid out of the tab order', () => {
    const { container } = render(Gallery, { props: { images } });
    const list = container.querySelector('ul')!;
    expect(list.hasAttribute('tabindex')).toBe(false);
    expect(list.hasAttribute('aria-label')).toBe(false);
  });

  it('lets a keyboard reach a row that scrolls, and names it', () => {
    const { getByRole } = render(Gallery, { props: { images, layout: 'row' } });
    const row = getByRole('list', { name: 'Gallery' });
    // WebKit drops the role of a list drawn without markers, and with it the name.
    expect(row.getAttribute('role')).toBe('list');
    expect(row.getAttribute('tabindex')).toBe('0');
    expect(row.className).toMatch(/\boverflow-x-auto\b/);
  });
});
