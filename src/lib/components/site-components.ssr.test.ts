// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Columns from './Columns.svelte';
import Image from './Image.svelte';
import Prose from './Prose.svelte';
import Quote from './Quote.svelte';
import Section from './Section.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/**
 * A page drawn for visitors is rendered on the server and ships no script, so
 * everything each component shows has to be in the server's HTML, and nothing
 * in it may ask for script: no script element and no inline handler, which a
 * content security policy refuses besides. An image that gains a spread or a
 * handler gets `onload` and `onerror` from the server render.
 */
const pages = {
  Section: () =>
    render(Section, {
      props: {
        label: 'Welcome',
        image: { src: '/hero.jpg', alt: '' },
        overlay: 'dark',
        height: 'tall',
        intro: text('Intro'),
        children: text('Body'),
        footer: text('End'),
      },
    }).body,
  Columns: () => render(Columns, { props: { max: 3, children: text('Column') } }).body,
  Prose: () => render(Prose, { props: { children: text('Paragraph') } }).body,
  Image: () =>
    render(Image, {
      props: { src: '/a.png', alt: 'A chart', width: 400, height: 300, caption: 'Caption' },
    }).body,
  Quote: () => render(Quote, { props: { source: 'A reader', children: text('Words') } }).body,
};

describe('the site components, rendered on the server', () => {
  it.each(Object.keys(pages) as (keyof typeof pages)[])('%s carries no script', (name) => {
    const html = pages[name]();
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });

  it('carries every part of a section', () => {
    const html = pages.Section();
    for (const part of ['Intro', 'Body', 'End', 'aria-label="Welcome"', 'data-scheme="dark"']) {
      expect(html).toContain(part);
    }
  });

  it('carries the content of the rest', () => {
    expect(pages.Columns()).toContain('Column');
    expect(pages.Prose()).toContain('Paragraph');
    expect(pages.Quote()).toContain('Words');
    expect(pages.Quote()).toContain('A reader');
  });

  it("reserves an image's box in the HTML", () => {
    const html = pages.Image();
    expect(html).toMatch(/<img[^>]*width="400"[^>]*height="300"/);
    expect(html).toContain('Caption');
    const unsized = render(Image, { props: { src: '/a.png', alt: '' } }).body;
    expect(unsized).toMatch(/<img[^>]*class="[^"]*aspect-video/);
  });
});
