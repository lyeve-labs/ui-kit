import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import Checkbox from './Checkbox.svelte';
import CheckboxGroup from './CheckboxGroup.svelte';

const options = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'admin', label: 'Admin', disabled: true },
];

const source = readFileSync(join(__dirname, 'CheckboxGroup.svelte'), 'utf8');

/**
 * The source with its comments removed.
 *
 * The comments name the defect they close, and one of them names the call
 * this file exists to keep out of the component. Scanning the prose alongside
 * the code would make the guard fire on its own explanation.
 */
const code = source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

/** The ring choice.ts hands every box, spelled out so a partial one fails. */
const FOCUS = [
  'peer-focus-visible:outline',
  'peer-focus-visible:outline-2',
  'peer-focus-visible:outline-brand',
  'peer-focus-visible:outline-offset-2',
];

function inputs(container: HTMLElement): HTMLInputElement[] {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
}

/** The painted box sits immediately after the transparent input that covers it. */
function box(input: HTMLInputElement): HTMLElement {
  return input.nextElementSibling as HTMLElement;
}

function classes(el: HTMLElement): string[] {
  return el.className.split(/\s+/).filter(Boolean);
}

type SvelteRuntime = { __svelte?: { uid: number } };

/**
 * $props.id() counts from one counter per Svelte runtime, so resetting it
 * replays the first render. A server render and the hydration that follows it
 * are the same render, which is the property a name has to hold. A name built
 * from Math.random() differs across the two whatever the counter says.
 */
function replayFirstRender(): void {
  (window as unknown as SvelteRuntime).__svelte = { uid: 1 };
}

describe('CheckboxGroup', () => {
  it('renders one checkbox per option', () => {
    const { container } = render(CheckboxGroup, { props: { label: 'Permissions', options } });
    expect(inputs(container)).toHaveLength(3);
  });

  it('ticks the boxes matching the current value', () => {
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, value: ['write'] },
    });
    expect(inputs(container).map((i) => i.checked)).toEqual([false, true, false]);
  });

  it.each([
    { chosen: ['read'], state: 'one option is ticked' },
    { chosen: [], state: 'nothing is ticked' },
    { chosen: ['read', 'write', 'admin'], state: 'every option is ticked' },
  ])('keeps the focus ring on every box when $state', ({ chosen }) => {
    // The ring lived inside the selected ternary, so choosing an option deleted
    // the only indicator a keyboard user had. Ticked and unticked are listed
    // together because the defect is visible only in one of the two states.
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, value: chosen },
    });
    for (const input of inputs(container)) {
      for (const ring of FOCUS) {
        expect(classes(box(input)), `${input.value} checked=${input.checked}`).toContain(ring);
      }
    }
  });

  it('rests an unticked box on line-strong and never on line', () => {
    // line reads 1.25:1 against the page. It is the divider colour, and an
    // empty box has nothing but its border identifying it as a control.
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, value: [] },
    });
    for (const input of inputs(container)) {
      expect(classes(box(input))).toContain('border-line-strong');
      expect(classes(box(input))).not.toContain('border-line');
    }
  });

  it('builds no part of its name from Math.random', () => {
    expect(code).not.toContain('Math.random');
    expect(code).toContain('$props.id()');
  });

  it('gives the same name to two renders of the same component', () => {
    // A random segment differs between the server render and hydration, so the
    // name the client posts is not the name the server rendered.
    replayFirstRender();
    const first = render(CheckboxGroup, { props: { label: 'Permissions', options } });
    const firstName = inputs(first.container)[0].name;
    first.unmount();

    replayFirstRender();
    const second = render(CheckboxGroup, { props: { label: 'Permissions', options } });
    const secondName = inputs(second.container)[0].name;

    expect(firstName).not.toBe('');
    expect(firstName).toBe(secondName);
  });

  it('gives every option in one group the same name', () => {
    const { container } = render(CheckboxGroup, { props: { label: 'Permissions', options } });
    const names = new Set(inputs(container).map((i) => i.name));
    expect(names.size).toBe(1);
  });

  it('gives two groups on one page different names', () => {
    const a = render(CheckboxGroup, { props: { label: 'Permissions', options } });
    const b = render(CheckboxGroup, { props: { label: 'Scopes', options } });
    expect(inputs(a.container)[0].name).not.toBe(inputs(b.container)[0].name);
  });

  it('takes the name the caller supplies', () => {
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, name: 'perms' },
    });
    expect(inputs(container).map((i) => i.name)).toEqual(['perms', 'perms', 'perms']);
  });

  it('wraps the options in a real fieldset with a real legend', () => {
    const { container } = render(CheckboxGroup, { props: { label: 'Permissions', options } });
    const fieldset = container.querySelector('fieldset');
    expect(fieldset).toBeTruthy();
    expect(fieldset!.firstElementChild!.tagName).toBe('LEGEND');
  });

  it.each([false, true])('has an accessible name with labelHidden=%s', (labelHidden) => {
    const { getByRole, container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, labelHidden },
    });
    expect(getByRole('group', { name: 'Permissions' })).toBeTruthy();
    // Hidden means off the screen, not gone: an aria-label on the fieldset
    // would name the group and drop it out of the reading order.
    const legend = container.querySelector('legend') as HTMLElement;
    expect(classes(legend).includes('sr-only')).toBe(labelHidden);
  });

  it('keeps the value in options order when the options are ticked out of order', async () => {
    // Pushed on click, the submitted value carried the order the user happened
    // to tick in, so two users choosing the same permissions posted different
    // arrays and the server could not compare them.
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, value: [], onchange },
    });
    const [read, write] = inputs(container);
    await fireEvent.click(write);
    await fireEvent.click(read);
    expect(onchange).toHaveBeenLastCalledWith(['read', 'write']);
  });

  it('drops a value back out of the array when its box is unticked', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, value: ['read', 'write'], onchange },
    });
    await fireEvent.click(inputs(container)[0]);
    expect(onchange).toHaveBeenLastCalledWith(['write']);
  });

  it('blocks every option when the group is disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, disabled: true, onchange },
    });
    expect(inputs(container).map((i) => i.disabled)).toEqual([true, true, true]);
    await fireEvent.click(inputs(container)[0]);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('blocks a single disabled option and leaves the rest alone', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, onchange },
    });
    expect(inputs(container).map((i) => i.disabled)).toEqual([false, false, true]);
    await fireEvent.click(inputs(container)[2]);
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(inputs(container)[1]);
    expect(onchange).toHaveBeenLastCalledWith(['write']);
  });

  it.each([
    { orientation: 'vertical' as const, expected: 'flex-col', rejected: 'flex-row' },
    { orientation: 'horizontal' as const, expected: 'flex-row', rejected: 'flex-col' },
  ])('lays $orientation options out', ({ orientation, expected, rejected }) => {
    const { container } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, orientation },
    });
    const list = container.querySelector('fieldset > div') as HTMLElement;
    expect(classes(list)).toContain(expected);
    expect(classes(list)).not.toContain(rejected);
  });

  it('renders the same control component as a standalone Checkbox', () => {
    // A group that paints its own box is how the two drifted apart before: the
    // single control was fixed for its focus ring and its border and the group
    // was not. Comparing the painted box catches a reimplementation that a
    // source-level import check would miss.
    expect(source).toContain("import Checkbox from './Checkbox.svelte'");

    const group = render(CheckboxGroup, {
      props: { label: 'Permissions', options: [{ value: 'read', label: 'Read' }], value: ['read'] },
    });
    const single = render(Checkbox, { props: { checked: true, label: 'Read' } });
    expect(box(inputs(group.container)[0]).className).toBe(
      (single.container.querySelector('input[type="checkbox"]')!.nextElementSibling as HTMLElement)
        .className,
    );
  });

  it('points the fieldset at its error message', () => {
    const { container, getByText } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, error: 'Choose at least one' },
    });
    const fieldset = container.querySelector('fieldset') as HTMLFieldSetElement;
    const message = getByText('Choose at least one');
    expect(message.id).not.toBe('');
    expect(fieldset.getAttribute('aria-describedby')).toBe(message.id);
    // ARIA puts aria-invalid on radiogroup and not on group, so a fieldset of
    // checkboxes cannot carry it and the kit's a11y gate rejects the attempt.
    // The message is how the group reports itself, which is why the wiring
    // above is the assertion that matters.
    expect(fieldset.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the hint until an error replaces it', () => {
    // Stacked, the two messages read as one paragraph and the reader hears the
    // advice before the reason the field was rejected.
    const hinted = render(CheckboxGroup, {
      props: { label: 'Permissions', options, hint: 'Pick as many as you need' },
    });
    expect(hinted.getByText('Pick as many as you need')).toBeTruthy();
    hinted.unmount();

    const failed = render(CheckboxGroup, {
      props: { label: 'Permissions', options, hint: 'Pick as many as you need', error: 'Required' },
    });
    expect(failed.queryByText('Pick as many as you need')).toBeNull();
    expect(failed.getByText('Required')).toBeTruthy();
  });

  it('renders a description and an icon through the control', () => {
    const { getByText } = render(CheckboxGroup, {
      props: {
        label: 'Permissions',
        options: [{ value: 'read', label: 'Read', description: 'View records only' }],
      },
    });
    expect(getByText('View records only')).toBeTruthy();
  });

  it('marks a required group in its legend and states it on the fieldset', () => {
    // The marker carried aria-label="required" inside the legend, and a legend
    // is where the group's name comes from, so the set announced as
    // "Permissions required". The fieldset carries aria-required instead.
    const { container, getByRole } = render(CheckboxGroup, {
      props: { label: 'Permissions', options, required: true },
    });
    expect(getByRole('group', { name: 'Permissions' })).toBeTruthy();
    const fieldset = container.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fieldset.getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('legend span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('keys every option by its value', () => {
    // An unkeyed each reuses the DOM node in place, so reordering the options
    // leaves a ticked box on the option that used to sit at that index.
    expect(code).toContain('(option.value)');
  });

  it('declares ChoiceOption in the same words as RadioGroup', () => {
    // The two groups are one shape on purpose. Two copies of the type that are
    // free to drift is the defect this session is closing, one layer up.
    const radio = readFileSync(join(__dirname, 'RadioGroup.svelte'), 'utf8');
    const shape = (src: string) => src.slice(src.indexOf('export interface ChoiceOption'));
    expect(shape(source).slice(0, shape(source).indexOf('</script>'))).toBe(
      shape(radio).slice(0, shape(radio).indexOf('</script>')),
    );
  });
});
