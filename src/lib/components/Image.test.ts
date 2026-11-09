import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Image from './Image.svelte';

describe('Image', () => {
  it('reserves its box from its own width and height', () => {
    const { container } = render(Image, {
      props: { src: '/a.png', alt: 'A chart', width: 400, height: 300 },
    });
    const img = container.querySelector('img')!;
    expect(img.getAttribute('width')).toBe('400');
    expect(img.getAttribute('height')).toBe('300');
    expect(img.className).not.toMatch(/aspect-/);
  });

  it('crops an image of unknown size to its ratio, 16/9 unless it names one', () => {
    const wide = render(Image, { props: { src: '/a.png', alt: 'A' } });
    expect(wide.container.querySelector('img')!.className).toMatch(/\baspect-video\b/);
    const square = render(Image, { props: { src: '/a.png', alt: 'A', ratio: '1/1' } });
    const img = square.container.querySelector('img')!;
    expect(img.className).toMatch(/\baspect-square\b/);
    expect(img.hasAttribute('width')).toBe(false);
  });

  it('loads lazily and decodes off the main thread unless asked otherwise', () => {
    const lazy = render(Image, { props: { src: '/a.png', alt: 'A' } });
    expect(lazy.container.querySelector('img')!.getAttribute('loading')).toBe('lazy');
    expect(lazy.container.querySelector('img')!.getAttribute('decoding')).toBe('async');
    const eager = render(Image, { props: { src: '/a.png', alt: 'A', loading: 'eager' } });
    expect(eager.container.querySelector('img')!.getAttribute('loading')).toBe('eager');
  });

  it('keeps an empty alt, which marks the image decorative', () => {
    const { container } = render(Image, { props: { src: '/a.png', alt: '' } });
    expect(container.querySelector('img')!.getAttribute('alt')).toBe('');
  });

  it('puts a captioned image in a figure', () => {
    const { container } = render(Image, {
      props: { src: '/a.png', alt: 'A', caption: 'The first draft.' },
    });
    expect(container.querySelector('figure > img')).toBeTruthy();
    expect(container.querySelector('figcaption')?.textContent).toBe('The first draft.');
  });
});
