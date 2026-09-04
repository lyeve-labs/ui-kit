import { Settings } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FilterFn } from '../internal/filter.js';
import Select from './Select.svelte';
import type { SelectOption } from './Select.svelte';

const options = createRawSnippet(() => ({
  render: () => '<optgroup><option value="a">A</option><option value="b">B</option></optgroup>',
}));

describe('Select', () => {
  it('renders its option children', () => {
    const { getByText } = render(Select, { props: { children: options } });
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
  });

  it('reflects the selected value', () => {
    const { container } = render(Select, { props: { children: options, value: 'b' } });
    expect((container.querySelector('select') as HTMLSelectElement).value).toBe('b');
  });

  it('fires onchange when the selection changes', async () => {
    const onchange = vi.fn();
    const { container } = render(Select, { props: { children: options, value: 'a', onchange } });
    await fireEvent.change(container.querySelector('select') as HTMLSelectElement, {
      target: { value: 'b' },
    });
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('shows an error message and the danger border', () => {
    const { container, getByText } = render(Select, {
      props: { children: options, error: 'Pick one' },
    });
    expect(getByText('Pick one').className).toContain('text-danger');
    expect(container.querySelector('select')?.className).toContain('border-danger');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Select, { props: { children: options, disabled: true } });
    expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });
});

/**
 * Four kinds of select share one component, and three of the four are new. The
 * cases below are the ones a caller can break without noticing: the mode that
 * decides whether a form carries a value at all, the event signature 34 call
 * sites are contextually typed from, and the parts that must come from the
 * shared modules rather than from a fourth copy of them.
 */

/** Two rows with nothing in common, so a matcher cannot pass by accident. */
const PLANS: SelectOption[] = [
  { value: 'alpha', label: 'First' },
  { value: 'beta', label: 'Second' },
];

/** Two groups, one row outside them, in source order. */
const GROUPED: SelectOption[] = [
  { value: 'usd', label: 'US dollar', group: 'Americas' },
  { value: 'cad', label: 'Canadian dollar', group: 'Americas' },
  { value: 'eur', label: 'Euro', group: 'Europe' },
  { value: 'xdr', label: 'Special drawing rights' },
];

const ICONS: SelectOption[] = [
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'plain', label: 'Plain' },
];

const source = readFileSync(join(__dirname, 'Select.svelte'), 'utf8');

const trigger = (container: HTMLElement): HTMLButtonElement =>
  container.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;

const rows = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll('[role="option"]'));

const labels = (container: HTMLElement): string[] =>
  rows(container).map((row) => (row.textContent ?? '').trim());

describe('Select: the native element stays the default', () => {
  it('renders a native select when no mode is asked for', () => {
    // A listbox submits nothing. Most call sites sit in a form and pass name,
    // so inferring the mode from options would empty those submissions.
    const { container } = render(Select, { props: { name: 'plan', options: PLANS } });
    expect(container.querySelector('select')).toBeTruthy();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect((container.querySelector('select') as HTMLSelectElement).name).toBe('plan');
  });

  it('hands onchange an event whose currentTarget is the select', async () => {
    // One call site reaches currentTarget.form.requestSubmit(), which only a
    // form-associated element carries.
    let seen: EventTarget | null = null;
    const { container } = render(Select, {
      props: {
        options: PLANS,
        value: 'alpha',
        onchange: (e) => {
          seen = e.currentTarget;
        },
      },
    });
    const select = container.querySelector('select') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: 'beta' } });

    expect(seen).toBe(select);
    expect(seen).toBeInstanceOf(HTMLSelectElement);
  });

  it('renders options as native option elements in native mode', () => {
    const { container } = render(Select, { props: { options: PLANS } });
    const elements = Array.from(container.querySelectorAll('option'));
    expect(elements.map((o) => o.value)).toEqual(['alpha', 'beta']);
    expect(elements.map((o) => (o.textContent ?? '').trim())).toEqual(['First', 'Second']);
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0);
  });

  it('renders a group as an optgroup', () => {
    const { container } = render(Select, { props: { options: GROUPED } });
    const groups = Array.from(container.querySelectorAll('optgroup'));
    expect(groups.map((g) => g.label)).toEqual(['Americas', 'Europe']);
    expect(Array.from(groups[0].querySelectorAll('option')).map((o) => o.value)).toEqual([
      'usd',
      'cad',
    ]);
    // A row that names no group stays outside every optgroup.
    const loose = container.querySelector('option[value="xdr"]') as HTMLOptionElement;
    expect(loose.closest('optgroup')).toBeNull();
  });

  it('reports a listbox-only prop instead of changing what the form submits', () => {
    // Upgrading the mode would swap a form-associated element for a button and
    // silence the change event the auto-submitting call sites depend on.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(Select, { props: { options: PLANS, searchable: true } });

    expect(container.querySelector('select')).toBeTruthy();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('searchable');
    warn.mockRestore();
  });
});

describe('Select: listbox mode', () => {
  it('renders a hidden input that carries the value', async () => {
    const { container } = render(Select, {
      props: { mode: 'listbox', name: 'plan', options: PLANS, value: 'alpha' },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.name).toBe('plan');
    expect(hidden.value).toBe('alpha');

    await fireEvent.click(trigger(container));
    await fireEvent.click(rows(container)[1]);
    expect(hidden.value).toBe('beta');
  });

  it('takes its keyboard navigation from the shared listbox module', async () => {
    const { container } = render(Select, { props: { mode: 'listbox', options: GROUPED } });
    const button = trigger(container);

    // Closed, and naming nothing: a dangling idref announces as silence.
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-activedescendant')).toBeNull();

    await fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-activedescendant')).toBe(rows(container)[0].id);

    await fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(button.getAttribute('aria-activedescendant')).toBe(rows(container)[1].id);

    // Home and End are the two the kit's only hand-rolled keyboard never had.
    await fireEvent.keyDown(button, { key: 'End' });
    expect(button.getAttribute('aria-activedescendant')).toBe(rows(container)[3].id);
    await fireEvent.keyDown(button, { key: 'Home' });
    expect(button.getAttribute('aria-activedescendant')).toBe(rows(container)[0].id);

    await fireEvent.keyDown(button, { key: 'Enter' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect((container.querySelector('input[type="hidden"]') as HTMLInputElement).value).toBe('usd');
  });

  it('writes no keyboard model, no panel class and no listbox ARIA of its own', () => {
    // The four lists that shipped before this each hand-rolled all three, and
    // every copy was wrong somewhere different.
    expect(source).toContain('createListbox');
    expect(source).toContain('panelOption');
    expect(source).toContain('applyFilter');
    // The attribute, not the word: a comment is free to name what the module
    // emits. role and aria-expanded are the two the compiler has to read in the
    // source to check the rest, so they are stated as well as spread.
    expect(source).not.toMatch(/aria-activedescendant=|role="listbox"|aria-controls=/);
    expect(source).not.toMatch(/'(ArrowDown|ArrowUp|Home|End|Escape|Tab)'/);
  });

  it('reports its value through onvaluechange, leaving the event signature frozen', async () => {
    const onvaluechange = vi.fn();
    const { container } = render(Select, {
      props: { mode: 'listbox', options: PLANS, onvaluechange },
    });
    await fireEvent.click(trigger(container));
    await fireEvent.click(rows(container)[1]);
    expect(onvaluechange).toHaveBeenCalledWith('beta');
  });

  it('names each group once and puts its rows inside it', async () => {
    const { container } = render(Select, { props: { mode: 'listbox', options: GROUPED } });
    await fireEvent.click(trigger(container));

    const groups = Array.from(container.querySelectorAll('[role="group"]'));
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Americas', 'Europe']);
    expect(groups[0].querySelectorAll('[role="option"]')).toHaveLength(2);
    expect(
      (container.querySelector('[role="option"][id$="-option-3"]') as HTMLElement).closest(
        '[role="group"]',
      ),
    ).toBeNull();
  });
});

describe('Select: filtering', () => {
  it('replaces the default matcher with a custom filter', async () => {
    // 'bet' is in no label, so the default matcher keeps nothing. This one
    // reads the value, which is the case a list keyed by machine name needs.
    const byValue: FilterFn<SelectOption> = (option, ctx) => option.value.includes(ctx.needle);
    const { container } = render(Select, {
      props: { mode: 'listbox', options: PLANS, searchable: true, filter: byValue },
    });
    await fireEvent.click(trigger(container));
    const search = container.querySelector('input[type="text"]') as HTMLInputElement;

    await fireEvent.input(search, { target: { value: 'bet' } });
    expect(labels(container)).toEqual(['Second']);
  });

  it('keeps every row when filter is false', async () => {
    // The list arrived narrowed by a server query, so a keystroke still in the
    // box must not cut it again.
    const { container } = render(Select, {
      props: { mode: 'listbox', options: PLANS, searchable: true, filter: false },
    });
    await fireEvent.click(trigger(container));
    const search = container.querySelector('input[type="text"]') as HTMLInputElement;

    await fireEvent.input(search, { target: { value: 'nothing matches this' } });
    expect(labels(container)).toEqual(['First', 'Second']);
  });

  it('falls back to the default matcher over labels and keywords', async () => {
    const withKeywords: SelectOption[] = [
      { value: 'alpha', label: 'First', keywords: ['primary'] },
      { value: 'beta', label: 'Second' },
    ];
    const { container } = render(Select, {
      props: { mode: 'listbox', options: withKeywords, searchable: true },
    });
    await fireEvent.click(trigger(container));
    const search = container.querySelector('input[type="text"]') as HTMLInputElement;

    await fireEvent.input(search, { target: { value: 'primary' } });
    expect(labels(container)).toEqual(['First']);
  });
});

describe('Select: icons and a custom trigger', () => {
  it('draws an option icon in listbox mode', async () => {
    const { container } = render(Select, { props: { mode: 'listbox', options: ICONS } });
    await fireEvent.click(trigger(container));

    const [withIcon, without] = rows(container);
    expect(withIcon.querySelector('svg')).toBeTruthy();
    expect(without.querySelector('svg')).toBeNull();
  });

  it('drops an option icon in native mode, where an option holds text only', () => {
    const { container } = render(Select, { props: { options: ICONS } });
    expect(container.querySelectorAll('option svg')).toHaveLength(0);
    expect(
      Array.from(container.querySelectorAll('option')).map((o) => (o.textContent ?? '').trim()),
    ).toEqual(['Settings', 'Plain']);
  });

  it('hands the custom trigger the selected option and the open state', () => {
    const custom = createRawSnippet<[{ selected: SelectOption | undefined; open: boolean }]>(
      (arg) => ({
        render: () =>
          `<span data-testid="custom">${arg().selected?.label ?? 'nothing'} / ${arg().open ? 'open' : 'closed'}</span>`,
      }),
    );
    const { container, getByTestId } = render(Select, {
      props: { mode: 'listbox', options: PLANS, value: 'beta', trigger: custom },
    });

    expect(getByTestId('custom').textContent).toBe('Second / closed');
    // It fills the trigger rather than replacing it, so the id, the label
    // association and the ARIA stay on one focusable element.
    expect(getByTestId('custom').closest('button')).toBe(trigger(container));
  });

  it('shows the placeholder when nothing is selected, in both modes', async () => {
    const listbox = render(Select, {
      props: { mode: 'listbox', options: PLANS, placeholder: 'Pick a plan' },
    });
    expect(trigger(listbox.container).textContent).toContain('Pick a plan');

    const native = render(Select, { props: { options: PLANS, placeholder: 'Pick a plan' } });
    const first = native.container.querySelector('option') as HTMLOptionElement;
    expect(first.value).toBe('');
    expect((first.textContent ?? '').trim()).toBe('Pick a plan');
  });
});

describe('Select required marker', () => {
  const rows: SelectOption[] = [
    { value: 'free', label: 'Free' },
    { value: 'team', label: 'Team' },
  ];

  it('states the requirement on the native select, not in its accessible name', () => {
    // The marker carried aria-label="required" inside the label, which fed the
    // control's name, so the field announced as "Plan required".
    const { container, getByRole } = render(Select, {
      props: { label: 'Plan', options: rows, required: true },
    });
    expect(getByRole('combobox', { name: 'Plan' })).toBeTruthy();
    expect((container.querySelector('select') as HTMLSelectElement).required).toBe(true);
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });

  it('states the requirement on the listbox trigger too', () => {
    // Listbox mode has no native control to take `required`, so the trigger
    // carries aria-required. It is a combobox, which is a role that supports it.
    const { container, getByRole } = render(Select, {
      props: { label: 'Plan', options: rows, mode: 'listbox' as const, required: true },
    });
    expect(getByRole('combobox', { name: 'Plan' })).toBeTruthy();
    const trigger = container.querySelector('[role="combobox"]') as HTMLElement;
    expect(trigger.getAttribute('aria-required')).toBe('true');
  });
});
