import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Section from './Section.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Section', () => {
  it('puts the introduction in a header, the content after it and the footer last', () => {
    const { container } = render(Section, {
      props: { intro: text('Intro'), children: text('Body'), footer: text('End') },
    });
    const section = container.querySelector('section')!;
    expect(section.querySelector('header')?.textContent).toBe('Intro');
    expect(section.querySelector('footer')?.textContent).toBe('End');
    expect(section.textContent?.replace(/\s+/g, '')).toBe('IntroBodyEnd');
  });

  it('is a named region only when it has a label', () => {
    const named = render(Section, { props: { label: 'Pricing', children: text('x') } });
    expect(named.getByRole('region', { name: 'Pricing' })).toBeTruthy();
    const plain = render(Section, { props: { children: text('x') } });
    expect(plain.container.querySelector('section')!.hasAttribute('aria-label')).toBe(false);
  });

  it('names the overlay as its scheme, so everything inside draws in that palette', () => {
    for (const overlay of ['dark', 'light'] as const) {
      const { container } = render(Section, { props: { overlay, children: text('x') } });
      const section = container.querySelector('section')!;
      expect(section.dataset.scheme).toBe(overlay);
      expect(section.querySelector('[aria-hidden="true"]')!.className).toMatch(/\bbg-ink\/\d+/);
    }
    const none = render(Section, { props: { children: text('x') } });
    expect(none.container.querySelector('section')!.hasAttribute('data-scheme')).toBe(false);
  });

  it('draws its image behind the content, before it in source order', () => {
    const { container } = render(Section, {
      props: { image: { src: '/hero.jpg' }, overlay: 'dark', children: text('Body') },
    });
    const section = container.querySelector('section')!;
    const [image, overlay, content] = [...section.children];
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('alt')).toBe('');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(content.className).toMatch(/\brelative\b/);
  });

  it('centers its content in a tall or a full window band', () => {
    const tall = render(Section, { props: { height: 'tall', children: text('x') } });
    expect(tall.container.querySelector('section')!.className).toMatch(/\bmin-h-band-tall\b/);
    const screen = render(Section, { props: { height: 'screen', children: text('x') } });
    expect(screen.container.querySelector('section')!.className).toMatch(/\bmin-h-svh\b/);
  });
});
