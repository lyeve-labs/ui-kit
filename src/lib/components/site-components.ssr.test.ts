// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { BLOCK_COMPONENTS } from '../../../scripts/site-css.mjs';
import SiteBlocksStory from '../../../tests/ct/SiteBlocksStory.svelte';
import AccordionItems from '../../../tests/fixtures/AccordionItems.svelte';
import AccordionItem from './AccordionItem.svelte';
import Badge from './Badge.svelte';
import Button from './Button.svelte';
import Card from './Card.svelte';
import Checkbox from './Checkbox.svelte';
import Columns from './Columns.svelte';
import Field, { type FieldWiring } from './Field.svelte';
import Footer from './Footer.svelte';
import FormMessage from './FormMessage.svelte';
import Gallery from './Gallery.svelte';
import Image from './Image.svelte';
import Input from './Input.svelte';
import Label from './Label.svelte';
import NavBar from './NavBar.svelte';
import Prose from './Prose.svelte';
import Quote from './Quote.svelte';
import Section from './Section.svelte';
import SectionHeading from './SectionHeading.svelte';
import Textarea from './Textarea.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

// A control wired the way Field's notes say, from the ids it hands over.
const wired = createRawSnippet((wiring: () => FieldWiring) => ({
  render: () => `<input id="${wiring().id}" aria-describedby="${wiring().describedBy}">`,
}));

/**
 * A page drawn for visitors is rendered on the server and ships no script, so
 * everything each component shows has to be in the server's HTML, and nothing
 * in it may ask for script: no script element and no inline handler, which a
 * content security policy refuses besides. An image that gains a spread or a
 * handler gets `onload` and `onerror` from the server render.
 */
const pages = {
  Accordion: () => render(AccordionItems).body,
  AccordionItem: () =>
    render(AccordionItem, {
      props: { id: 'refunds', title: 'Refunds', children: text('Within 30 days.') },
    }).body,
  Badge: () => render(Badge, { props: { tone: 'success', children: text('New') } }).body,
  Button: () => render(Button, { props: { href: '/start', children: text('Start') } }).body,
  Checkbox: () =>
    render(Checkbox, {
      props: { label: 'Send me news', name: 'news', hint: 'One email a month.' },
    }).body,
  Field: () =>
    render(Field, {
      props: { label: 'Email', hint: 'Replies go to this address.', children: wired },
    }).body,
  FormMessage: () =>
    render(FormMessage, { props: { tone: 'success', children: text('Message sent.') } }).body,
  Input: () =>
    render(Input, {
      props: { label: 'Name', name: 'name', required: true, error: 'Enter a name.' },
    }).body,
  Label: () =>
    render(Label, { props: { for: 'email', required: true, children: text('Email') } }).body,
  SectionHeading: () =>
    render(SectionHeading, { props: { level: 2, children: text('Plans') } }).body,
  Textarea: () =>
    render(Textarea, {
      props: { label: 'Message', name: 'message', hint: 'Up to 500 characters.', maxlength: 500 },
    }).body,
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
  // site-page.ct.spec.ts measures this page in a browser, as a visitor gets
  // it, so the page it loads is the server's own HTML. A component change
  // that moves the HTML fails here until the file is written again with
  // pnpm exec vitest run -u src/lib/components/site-components.ssr.test.ts,
  // and the browser measures the new HTML. The file is one line, as the
  // server writes it, so the browser measures the exact markup.
  it('renders every component on one page, kept in the file the browser measures', async () => {
    await expect(render(SiteBlocksStory).body).toMatchFileSnapshot(
      '../../../tests/fixtures/site-page-ssr.html',
    );
  });

  it('covers every component a block uses', () => {
    expect(Object.keys(pages).sort()).toEqual([...BLOCK_COMPONENTS].sort());
  });

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

  it('carries each form part, its label and its message wired to its control', () => {
    const forOf = (html: string) => /<label[^>]*\sfor="([^"]+)"/.exec(html)?.[1];
    const idOf = (html: string, tag: string) =>
      new RegExp(`<${tag}[^>]*\\sid="([^"]+)"`).exec(html)?.[1];
    for (const [name, tag] of [
      ['Field', 'input'],
      ['Input', 'input'],
      ['Textarea', 'textarea'],
    ] as const) {
      const html = pages[name]();
      expect(forOf(html), name).toBeDefined();
      expect(idOf(html, tag), name).toBe(forOf(html));
    }
    // A checkbox sits inside its label and is named by the label's text.
    const box = pages.Checkbox();
    const named =
      /<label[^>]*>(?:(?!<\/label>).)*<input type="checkbox"[^>]*aria-labelledby="([^"]+)"/s.exec(
        box,
      );
    expect(box).toMatch(new RegExp(`id="${named?.[1]}"[^>]*>(<!---->)?Send me news`));
    // Each hint or error is the text of the element the control names as its description.
    const description = (html: string, tag: string) => {
      const id = new RegExp(`<${tag}[^>]*\\saria-describedby="([^"\\s]+)`).exec(html)?.[1];
      return new RegExp(`\\sid="${id}"[^>]*>(.*?)</`, 's').exec(html)?.[1] ?? '';
    };
    expect(description(box, 'input')).toContain('One email a month.');
    expect(description(pages.Field(), 'input')).toContain('Replies go to this address.');
    expect(description(pages.Input(), 'input')).toContain('Enter a name.');
    expect(pages.Input()).toMatch(/aria-invalid="true"/);
    expect(description(pages.Textarea(), 'textarea')).toContain('Up to 500 characters.');
    expect(pages.Label()).toMatch(/<label[^>]*\sfor="email"/);
    expect(pages.FormMessage()).toContain('Message sent.');
  });

  it('carries the content of the rest', () => {
    expect(pages.AccordionItem()).toMatch(/<details[^>]*\sid="refunds"/);
    expect(pages.AccordionItem()).toContain('Within 30 days.');
    expect(pages.Badge()).toContain('New');
    expect(pages.Button()).toMatch(/<a[^>]*\shref="\/start"/);
    expect(pages.SectionHeading()).toMatch(/<h2[^>]*>.*Plans/s);
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
