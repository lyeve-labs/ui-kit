import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import Radio from './Radio.svelte';
import RadioGroup from './RadioGroup.svelte';

const options = [
  { value: 'free', label: 'Free' },
  { value: 'team', label: 'Team' },
  { value: 'enterprise', label: 'Enterprise', disabled: true },
];

const source = readFileSync(join(__dirname, 'RadioGroup.svelte'), 'utf8');

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
  return [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
}

/** The painted ring sits immediately after the transparent input that covers it. */
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

describe('RadioGroup', () => {
  it('renders one radio per option', () => {
    const { container } = render(RadioGroup, { props: { label: 'Plan', options } });
    expect(inputs(container)).toHaveLength(3);
  });

  it('selects the radio matching the current value', () => {
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, value: 'team' },
    });
    expect(inputs(container).map((i) => i.checked)).toEqual([false, true, false]);
  });

  it.each([
    { chosen: 'free', state: 'the first option is selected' },
    { chosen: 'team', state: 'a middle option is selected' },
    { chosen: '', state: 'no option is selected' },
  ])('keeps the focus ring on every option when $state', ({ chosen }) => {
    // This is the defect. The ring sat inside the selected ternary, so choosing
    // an option removed the only indicator a keyboard user had, and in a list
    // of a hundred options that loses your place entirely. Selected and
    // unselected are listed together because the ring only vanished in one.
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, value: chosen },
    });
    for (const input of inputs(container)) {
      for (const ring of FOCUS) {
        expect(classes(box(input)), `${input.value} checked=${input.checked}`).toContain(ring);
      }
    }
  });

  it('keeps the focus ring on the selected option specifically', () => {
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, value: 'team' },
    });
    const selected = inputs(container).find((i) => i.checked) as HTMLInputElement;
    expect(selected).toBeTruthy();
    for (const ring of FOCUS) {
      expect(classes(box(selected))).toContain(ring);
    }
  });

  it('rests an unselected ring on line-strong and never on line', () => {
    // The group drew its circle with border-line, at 1.25:1 against the page,
    // where Radio and Checkbox had already moved to line-strong. The border is
    // the only thing marking an empty option as a control.
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, value: 'free' },
    });
    for (const input of inputs(container).filter((i) => !i.checked)) {
      expect(classes(box(input))).toContain('border-line-strong');
      expect(classes(box(input))).not.toContain('border-line');
    }
  });

  it('builds no part of its name from Math.random', () => {
    // The group named itself `rg-${Math.random().toString(36)}`.
    expect(code).not.toContain('Math.random');
    expect(code).toContain('$props.id()');
  });

  it('gives the same name to two renders of the same component', () => {
    // A random segment differs between the server render and hydration, so the
    // radios the client posts belong to a different group from the ones the
    // server rendered.
    replayFirstRender();
    const first = render(RadioGroup, { props: { label: 'Plan', options } });
    const firstName = inputs(first.container)[0].name;
    first.unmount();

    replayFirstRender();
    const second = render(RadioGroup, { props: { label: 'Plan', options } });
    const secondName = inputs(second.container)[0].name;

    expect(firstName).not.toBe('');
    expect(firstName).toBe(secondName);
  });

  it('gives every option in one group the same name', () => {
    // Radios that disagree about their name are separate groups, so selecting
    // one no longer clears the other.
    const { container } = render(RadioGroup, { props: { label: 'Plan', options } });
    expect(new Set(inputs(container).map((i) => i.name)).size).toBe(1);
  });

  it('gives two groups on one page different names', () => {
    const a = render(RadioGroup, { props: { label: 'Plan', options } });
    const b = render(RadioGroup, { props: { label: 'Billing', options } });
    expect(inputs(a.container)[0].name).not.toBe(inputs(b.container)[0].name);
  });

  it('takes the name the caller supplies', () => {
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, name: 'plan' },
    });
    expect(inputs(container).map((i) => i.name)).toEqual(['plan', 'plan', 'plan']);
  });

  it('wraps the options in a real fieldset with a real legend', () => {
    const { container } = render(RadioGroup, { props: { label: 'Plan', options } });
    const fieldset = container.querySelector('fieldset');
    expect(fieldset).toBeTruthy();
    expect(fieldset!.firstElementChild!.tagName).toBe('LEGEND');
    // A set of radios is a radiogroup, and that is the role ARIA lets carry
    // aria-invalid and aria-required.
    expect(fieldset!.getAttribute('role')).toBe('radiogroup');
  });

  it.each([false, true])('has an accessible name with labelHidden=%s', (labelHidden) => {
    const { getByRole, container } = render(RadioGroup, {
      props: { label: 'Plan', options, labelHidden },
    });
    expect(getByRole('radiogroup', { name: 'Plan' })).toBeTruthy();
    // Hidden means off the screen, not gone: an aria-label on the fieldset
    // would name the group and drop it out of the reading order.
    const legend = container.querySelector('legend') as HTMLElement;
    expect(classes(legend).includes('sr-only')).toBe(labelHidden);
  });

  it('reports the chosen value and moves the selection to it', async () => {
    const onchange = vi.fn();
    const { container } = render(RadioGroup, { props: { label: 'Plan', options, onchange } });
    await fireEvent.click(inputs(container)[1]);
    expect(onchange).toHaveBeenCalledWith('team');
    expect(inputs(container).map((i) => i.checked)).toEqual([false, true, false]);
  });

  it('blocks every option when the group is disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, disabled: true, onchange },
    });
    expect(inputs(container).map((i) => i.disabled)).toEqual([true, true, true]);
    await fireEvent.click(inputs(container)[0]);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('blocks a single disabled option and leaves the rest alone', async () => {
    const onchange = vi.fn();
    const { container } = render(RadioGroup, { props: { label: 'Plan', options, onchange } });
    expect(inputs(container).map((i) => i.disabled)).toEqual([false, false, true]);
    await fireEvent.click(inputs(container)[2]);
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(inputs(container)[1]);
    expect(onchange).toHaveBeenLastCalledWith('team');
  });

  it.each([
    { orientation: 'vertical' as const, expected: 'flex-col', rejected: 'flex-row' },
    { orientation: 'horizontal' as const, expected: 'flex-row', rejected: 'flex-col' },
  ])('lays $orientation options out', ({ orientation, expected, rejected }) => {
    const { container } = render(RadioGroup, { props: { label: 'Plan', options, orientation } });
    const list = container.querySelector('fieldset > div') as HTMLElement;
    expect(classes(list)).toContain(expected);
    expect(classes(list)).not.toContain(rejected);
  });

  it('renders the same control component as a standalone Radio', () => {
    // The group painting its own circle is exactly how it kept the focus ring
    // inside the selected branch and rested on border-line after Radio had
    // been fixed for both. Comparing the painted ring catches a
    // reimplementation that a source-level import check would miss.
    expect(source).toContain("import Radio from './Radio.svelte'");

    const group = render(RadioGroup, {
      props: { label: 'Plan', options: [{ value: 'free', label: 'Free' }], value: 'free' },
    });
    const single = render(Radio, { props: { value: 'free', group: 'free', label: 'Free' } });
    expect(box(inputs(group.container)[0]).className).toBe(
      (single.container.querySelector('input[type="radio"]')!.nextElementSibling as HTMLElement)
        .className,
    );
  });

  it('announces its error on the fieldset and points at the message', () => {
    const { container, getByText } = render(RadioGroup, {
      props: { label: 'Plan', options, error: 'Choose a plan' },
    });
    const fieldset = container.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fieldset.getAttribute('aria-invalid')).toBe('true');
    const message = getByText('Choose a plan');
    expect(fieldset.getAttribute('aria-describedby')).toBe(message.id);
    expect(message.id).not.toBe('');
  });

  it('announces a required group without a marker a reader cannot see', () => {
    const { container } = render(RadioGroup, {
      props: { label: 'Plan', options, required: true },
    });
    const fieldset = container.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fieldset.getAttribute('aria-required')).toBe('true');
  });

  it('shows the hint until an error replaces it', () => {
    // Stacked, the two messages read as one paragraph and the reader hears the
    // advice before the reason the field was rejected.
    const hinted = render(RadioGroup, {
      props: { label: 'Plan', options, hint: 'You can change this later' },
    });
    expect(hinted.getByText('You can change this later')).toBeTruthy();
    hinted.unmount();

    const failed = render(RadioGroup, {
      props: { label: 'Plan', options, hint: 'You can change this later', error: 'Required' },
    });
    expect(failed.queryByText('You can change this later')).toBeNull();
    expect(failed.getByText('Required')).toBeTruthy();
  });

  it('renders a description through the control', () => {
    const { getByText } = render(RadioGroup, {
      props: {
        label: 'Plan',
        options: [{ value: 'free', label: 'Free', description: 'One project, no card needed' }],
      },
    });
    expect(getByText('One project, no card needed')).toBeTruthy();
  });

  it('marks a required group in its legend and states it on the fieldset', () => {
    // The marker carried aria-label="required" inside the legend, and a legend
    // is where the group's name comes from, so the set announced as "Plan
    // required". aria-required on the radiogroup is what reports the state.
    const { container, getByRole } = render(RadioGroup, {
      props: { label: 'Plan', options, required: true },
    });
    expect(getByRole('radiogroup', { name: 'Plan' })).toBeTruthy();
    const fieldset = container.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fieldset.getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('legend span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('keys every option by its value', () => {
    // An unkeyed each reuses the DOM node in place, so reordering the options
    // leaves the selected ring on the option that used to sit at that index.
    expect(code).toContain('(option.value)');
  });
});
