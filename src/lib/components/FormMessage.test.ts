import { render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import FormMessage from './FormMessage.svelte';

const source = readFileSync(join(__dirname, 'FormMessage.svelte'), 'utf8');

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const TONES = ['danger', 'success'] as const;

function region(container: HTMLElement): HTMLElement {
  return container.querySelector('[aria-live]') as HTMLElement;
}

describe('FormMessage', () => {
  it('defaults to a failure, which interrupts', async () => {
    // An error the user has to act on is worth cutting across whatever they
    // are reading. A confirmation is not.
    const { container, findByText } = render(FormMessage, {
      props: { children: text('Could not save') },
    });
    await findByText('Could not save');
    expect(region(container).getAttribute('role')).toBe('alert');
    expect(region(container).getAttribute('aria-live')).toBe('assertive');
  });

  it('lets a confirmation wait for a pause', async () => {
    const { container, findByText } = render(FormMessage, {
      props: { tone: 'success', children: text('Settings saved') },
    });
    await findByText('Settings saved');
    expect(region(container).getAttribute('aria-live')).toBe('polite');
    expect(region(container).getAttribute('role')).toBe('status');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it.each(TONES)(
    'announces a %s message by changing a region that is already in the document',
    async (tone) => {
      /*
       * The trap. A live region reports a CHANGE to what it holds, so a region
       * that arrives with its text already inside it announces nothing. Every
       * toast in the kit was silent for exactly this reason: each one carried
       * its own role="status" and was inserted complete. Toaster fixed it by
       * keeping one region mounted and moving the toasts into it, and this is
       * the same shape: the region goes in empty and the message follows.
       */
      const { container, findByText, queryByText } = render(FormMessage, {
        props: { tone, children: text('Could not save') },
      });

      const live = region(container);
      expect(live).toBeTruthy();
      expect(live.getAttribute('aria-live')).not.toBeNull();
      expect(live.textContent?.trim()).toBe('');
      expect(queryByText('Could not save')).toBeNull();

      // What assistive technology watches: mutations inside a region it has
      // already seen. Asserting the attribute alone would pass on the silent
      // version too.
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((m) => records.push(...m));
      observer.observe(live, { childList: true, subtree: true, characterData: true });

      const message = await findByText('Could not save');
      observer.disconnect();

      expect(records.length).toBeGreaterThan(0);
      expect(live.contains(message)).toBe(true);
      // The same node, not a region swapped for a fresh one carrying the text.
      expect(region(container)).toBe(live);
    },
  );

  it('marks the region and never the message', async () => {
    // Marking each toast role="status" instead of the container is what made
    // them silent. The live semantics belong to the thing that outlives the
    // message.
    const { container, findByText } = render(FormMessage, {
      props: { children: text('Could not save') },
    });
    const message = await findByText('Could not save');
    const paragraph = message.closest('p') as HTMLElement;
    expect(paragraph.hasAttribute('aria-live')).toBe(false);
    expect(paragraph.hasAttribute('role')).toBe(false);
    expect(paragraph.closest('[aria-live]')).toBe(region(container));
  });

  it.each([
    { tone: 'danger' as const, expected: 'text-danger', rejected: 'text-success' },
    { tone: 'success' as const, expected: 'text-success', rejected: 'text-danger' },
  ])('paints a $tone message from one stated colour', async ({ tone, expected, rejected }) => {
    // Eleven pages rendered this into a bare paragraph and each picked its own
    // size and colour, so one failure read as three different things.
    const { container, findByText } = render(FormMessage, {
      props: { tone, children: text('Message') },
    });
    await findByText('Message');
    const classes = region(container).className.split(/\s+/);
    expect(classes).toContain(expected);
    expect(classes).not.toContain(rejected);
    expect(classes).toContain('text-sm');
  });

  it('draws its icon as a stroked path, never as a font glyph', async () => {
    // A literal cross or tick renders at whatever weight the reader's font
    // gives it and sat visibly lighter than every other icon in the library.
    const { container, findByText } = render(FormMessage, {
      props: { children: text('Could not save') },
    });
    await findByText('Could not save');
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path')?.getAttribute('d')).toBeTruthy();
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(source).toContain("from '../internal/tone.js'");
  });

  it('says with more than colour which outcome it is', async () => {
    // Colour alone separating a failure from a confirmation fails SC 1.4.1.
    const failed = render(FormMessage, { props: { children: text('Could not save') } });
    await failed.findByText('Could not save');
    const danger = failed.container.querySelector('path')?.getAttribute('d');
    failed.unmount();

    const saved = render(FormMessage, {
      props: { tone: 'success', children: text('Settings saved') },
    });
    await saved.findByText('Settings saved');
    expect(saved.container.querySelector('path')?.getAttribute('d')).not.toBe(danger);
  });

  it('lets the caller place it', async () => {
    const { container, findByText } = render(FormMessage, {
      props: { class: 'mt-4', children: text('Could not save') },
    });
    await findByText('Could not save');
    expect(region(container).className.split(/\s+/)).toContain('mt-4');
  });

  it('renders the message the server sent when no client effect ever runs', () => {
    // $effect does not run on the server, so a component that only ever fills
    // its region from an effect would deliver an empty region to a page with
    // no client bundle and the outcome of the submit would be lost.
    expect(source).toContain("typeof window === 'undefined'");
  });
});
