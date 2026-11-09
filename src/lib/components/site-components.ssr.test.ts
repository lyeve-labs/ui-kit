// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AccordionItems from '../../../tests/fixtures/AccordionItems.svelte';
import Card from './Card.svelte';
import Columns from './Columns.svelte';
import Footer from './Footer.svelte';
import Gallery from './Gallery.svelte';
import Image from './Image.svelte';
import NavBar from './NavBar.svelte';
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
  Accordion: () => render(AccordionItems).body,
  Card: () =>
    render(Card, {
      props: {
        title: 'Studio',
        image: { src: '/studio.jpg', alt: 'A desk' },
        children: text('Body'),
      },
    }).body,
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
  NavBar: () =>
    render(NavBar, {
      props: {
        brand: 'Northwind',
        logo: { src: '/logo.svg', alt: 'Northwind', width: 64, height: 32 },
        links: [{ label: 'Work', href: '/work', current: true }],
        action: { label: 'Contact', href: '/contact' },
      },
    }).body,
  Footer: () =>
    render(Footer, {
      props: {
        note: text('Note'),
        links: [{ label: 'Privacy', href: '/privacy' }],
        social: [{ network: 'github', href: 'https://github.com/example' }],
      },
    }).body,
  Gallery: () =>
    render(Gallery, {
      props: { layout: 'row', images: [{ src: '/a.jpg', alt: 'A desk', caption: 'Desk' }] },
    }).body,
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

  it('carries every question and answer, shut and sharing one name', () => {
    const html = pages.Accordion();
    for (const part of ['What is included?', 'Every block.', 'Can I cancel?', 'At any time.']) {
      expect(html).toContain(part);
    }
    const names = [...html.matchAll(/<details[^>]*\sname="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toHaveLength(2);
    expect(names[1]).toBe(names[0]);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it('names two accordions apart only when each render has its own id prefix', () => {
    const name = (idPrefix?: string) =>
      /<details[^>]*\sname="([^"]+)"/.exec(render(AccordionItems, { idPrefix }).body)![1];
    // Each render counts its ids from the start, so two renders repeat them.
    expect(name()).toBe(name());
    expect(name('faq')).not.toBe(name('plans'));
  });

  it('carries the content of the rest', () => {
    expect(pages.Card()).toContain('Studio');
    expect(pages.Card()).toContain('Body');
    expect(pages.Columns()).toContain('Column');
    expect(pages.Prose()).toContain('Paragraph');
    expect(pages.Quote()).toContain('Words');
    expect(pages.Quote()).toContain('A reader');
    for (const part of ['Northwind', 'Work', 'aria-current="page"', 'Contact']) {
      expect(pages.NavBar()).toContain(part);
    }
    for (const part of ['Note', 'Privacy', 'GitHub', 'rel="me"']) {
      expect(pages.Footer()).toContain(part);
    }
    expect(pages.Gallery()).toContain('Desk');
  });

  it("reserves an image's box in the HTML", () => {
    const html = pages.Image();
    expect(html).toMatch(/<img[^>]*width="400"[^>]*height="300"/);
    expect(html).toContain('Caption');
    const unsized = render(Image, { props: { src: '/a.png', alt: '' } }).body;
    expect(unsized).toMatch(/<img[^>]*class="[^"]*aspect-video/);
    expect(pages.NavBar()).toMatch(/<img[^>]*width="64"[^>]*height="32"/);
    expect(pages.Gallery()).toMatch(/<img[^>]*class="[^"]*aspect-\[4\/3\]/);
    expect(pages.Card()).toMatch(/<img[^>]*class="[^"]*aspect-video/);
  });
});
