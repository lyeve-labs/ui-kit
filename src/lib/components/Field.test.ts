import { render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Field from './Field.svelte';
import type { FieldWiring } from './Field.svelte';

const source = readFileSync(join(__dirname, 'Field.svelte'), 'utf8');

/**
 * The source with its comments removed.
 *
 * One of the comments names the call this component exists to keep out of an
 * id, so scanning the prose alongside the code would make the guard below fire
 * on its own explanation.
 */
const code = source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

/**
 * A control wired from the payload and from nothing else.
 *
 * This is the position a consumer is in: internal/field.ts is private, so the
 * only thing the control knows about the field around it is what Field handed
 * over. Every wiring the snippet receives is recorded, so a test can assert on
 * the payload rather than on the markup it happened to produce.
 */
function control(seen: FieldWiring[]) {
  return createRawSnippet<[FieldWiring]>((wiring) => ({
    render: () => {
      const w = wiring();
      seen.push(w);
      const described = w.describedBy ? ` aria-describedby="${w.describedBy}"` : '';
      const invalid = w.invalid ? ' aria-invalid="true"' : '';
      return `<input id="${w.id}" type="text"${described}${invalid} />`;
    },
  }));
}

function mount(props: Record<string, unknown> = {}) {
  const seen: FieldWiring[] = [];
  const view = render(Field, { props: { children: control(seen), ...props } });
  return { ...view, seen, wiring: () => seen[seen.length - 1] };
}

type SvelteRuntime = { __svelte?: { uid: number } };

/**
 * $props.id() counts from one counter per Svelte runtime, so resetting it
 * replays the first render. A server render and the hydration that follows it
 * are the same render, which is the property an id has to hold. An id built
 * from Math.random() differs across the two whatever the counter says.
 */
function replayFirstRender(): void {
  (window as unknown as SvelteRuntime).__svelte = { uid: 1 };
}

describe('Field', () => {
  it('renders a real label pointing at the id it handed the control', () => {
    const { container, wiring } = mount({ label: 'Email' });
    const label = container.querySelector('label') as HTMLLabelElement;
    const input = container.querySelector('input') as HTMLInputElement;
    expect(label.getAttribute('for')).toBe(wiring().id);
    expect(input.id).toBe(wiring().id);
    expect(input.id).not.toBe('');
  });

  it('names the control from that label', () => {
    const { getByRole } = mount({ label: 'Email' });
    expect(getByRole('textbox', { name: 'Email' })).toBeTruthy();
  });

  it('keeps the required marker out of the control accessible name', () => {
    // Accessible-name computation walks into the label, so a marker carrying
    // aria-label="required" appends the word to the name and the field
    // announces as "Email required". The control's own required attribute is
    // what reports the state; the asterisk is paint.
    const { container, getByRole } = mount({ label: 'Email', required: true });
    expect(getByRole('textbox', { name: 'Email' })).toBeTruthy();
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('draws no marker when the field is optional', () => {
    const { container } = mount({ label: 'Email' });
    expect(container.querySelector('label span')).toBeNull();
  });

  it.each([false, true])('keeps a real label association with labelHidden=%s', (labelHidden) => {
    const { container, getByRole } = mount({ label: 'Email', labelHidden });
    const label = container.querySelector('label') as HTMLLabelElement;
    const input = container.querySelector('input') as HTMLInputElement;
    // Hidden means off the screen, not gone. An aria-label on the control would
    // name it and drop the name out of the reading order.
    expect(label).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.id);
    expect(label.className.split(/\s+/).includes('sr-only')).toBe(labelHidden);
    expect(getByRole('textbox', { name: 'Email' })).toBeTruthy();
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('renders no label element when there is no label', () => {
    const { container } = mount();
    expect(container.querySelector('label')).toBeNull();
  });

  it('points the control at its hint', () => {
    const { container, wiring, getByText } = mount({ label: 'Email', hint: 'We never share it' });
    const input = container.querySelector('input') as HTMLInputElement;
    expect(wiring().describedBy).toBe(`${wiring().id}-hint`);
    expect(input.getAttribute('aria-describedby')).toBe(wiring().describedBy);
    expect(getByText('We never share it').id).toBe(wiring().describedBy);
  });

  it('points the control at its error, and the error wins over the hint', () => {
    // Stacked, the two read as one paragraph and the reader hears the advice
    // before the reason the field was rejected.
    const { container, wiring, queryByText, getByText } = mount({
      label: 'Email',
      hint: 'We never share it',
      error: 'Enter an email address',
    });
    const input = container.querySelector('input') as HTMLInputElement;
    expect(wiring().describedBy).toBe(`${wiring().id}-error`);
    expect(input.getAttribute('aria-describedby')).toBe(wiring().describedBy);
    expect(getByText('Enter an email address').id).toBe(wiring().describedBy);
    expect(queryByText('We never share it')).toBeNull();
  });

  it('resolves the id it handed over to the message actually on screen', () => {
    // The payload is only worth anything if the element it names exists. The
    // hand-rolled fields pointed at ids that were never rendered.
    for (const props of [
      { hint: 'A hint', text: 'A hint' },
      { error: 'An error', text: 'An error' },
    ]) {
      const { wiring, unmount } = mount({ label: 'Email', ...props });
      const target = document.getElementById(wiring().describedBy as string);
      expect(target?.textContent).toBe(props.text);
      unmount();
    }
  });

  it('leaves the control undescribed when there is no message', () => {
    const { container, wiring } = mount({ label: 'Email' });
    expect(wiring().describedBy).toBeUndefined();
    expect(
      (container.querySelector('input') as HTMLInputElement).hasAttribute('aria-describedby'),
    ).toBe(false);
  });

  it.each([
    { error: undefined, invalid: false },
    { error: 'Enter an email address', invalid: true },
  ])('reports invalid=$invalid to the control', ({ error, invalid }) => {
    const { container, wiring } = mount({ label: 'Email', error });
    expect(wiring().invalid).toBe(invalid);
    expect(
      (container.querySelector('input') as HTMLInputElement).getAttribute('aria-invalid'),
    ).toBe(invalid ? 'true' : null);
  });

  it('composes the shared field wrapper rather than a hand-copied class', () => {
    // The literal below is FIELD_WRAP. A form in a consuming app spelled it out
    // by hand, which is the drift this component exists to end: the wrapper can
    // only change in one place now.
    const { container } = mount({ label: 'Email', class: 'mt-4' });
    const wrap = container.firstElementChild as HTMLElement;
    for (const utility of ['flex', 'flex-col', 'gap-1.5', 'mt-4']) {
      expect(wrap.className.split(/\s+/)).toContain(utility);
    }
    expect(source).toContain("from '../internal/field.js'");
    expect(code).toContain('FIELD_WRAP');
  });

  it('paints the hint and the error from the shared contract', () => {
    const hinted = mount({ label: 'Email', hint: 'A hint' });
    expect(hinted.getByText('A hint').className).toContain('text-faint');
    hinted.unmount();

    const failed = mount({ label: 'Email', error: 'An error' });
    expect(failed.getByText('An error').className).toContain('text-danger');
  });

  it('takes an id from the caller', () => {
    const { container, wiring } = mount({ id: 'billing-email', label: 'Email' });
    expect(wiring().id).toBe('billing-email');
    expect((container.querySelector('label') as HTMLLabelElement).getAttribute('for')).toBe(
      'billing-email',
    );
    expect(container.querySelector('#billing-email-hint')).toBeNull();
  });

  it('hands the control a stable id that survives a rerender', async () => {
    // A random id recomputed on every update leaves the label pointing at the
    // control it named on the first paint and at nothing afterwards.
    const seen: FieldWiring[] = [];
    const { container, rerender } = render(Field, {
      props: { label: 'Email', hint: 'A hint', children: control(seen) },
    });
    const label = container.querySelector('label') as HTMLLabelElement;
    const before = label.getAttribute('for');

    await rerender({ label: 'Email', hint: 'A different hint' });

    expect(before).not.toBeNull();
    expect(label.getAttribute('for')).toBe(before);
    expect(seen[0].id).toBe(before);
    expect((container.querySelector('input') as HTMLInputElement).id).toBe(before);
  });

  it('builds no part of its id from Math.random', () => {
    expect(code).not.toContain('Math.random');
    expect(code).toContain('$props.id()');
  });

  it('gives the same id to two renders of the same component', () => {
    // A random segment differs between the server render and hydration, so the
    // label the server wrote points at an id the client never assigns.
    replayFirstRender();
    const first = mount({ label: 'Email' });
    const firstId = first.wiring().id;
    first.unmount();

    replayFirstRender();
    const second = mount({ label: 'Email' });

    expect(firstId).not.toBe('');
    expect(second.wiring().id).toBe(firstId);
  });

  it('gives two fields on one page different ids', () => {
    const a = mount({ label: 'Email' });
    const b = mount({ label: 'Phone' });
    expect(a.wiring().id).not.toBe(b.wiring().id);
  });
});
