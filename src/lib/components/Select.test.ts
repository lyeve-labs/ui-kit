import { Settings } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FilterFn } from '../internal/filter.js';
import Select from './Select.svelte';
import type { SelectOption } from './Select.svelte';

/**
 * One select, drawn by the kit. The cases below are the ones a caller can break
 * without noticing: whether a form carries the value at all, when the change
 * callback fires relative to that value, and the parts that must come from the
 * shared modules rather than from another copy of them.
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

describe('Select: never the native element', () => {
  it('renders no native select, option or optgroup', async () => {
    const { container } = render(Select, {
      props: { name: 'plan', options: GROUPED, value: 'usd' },
    });
    await fireEvent.click(trigger(container));
    expect(container.querySelector('select, option, optgroup')).toBeNull();
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it('keeps no native branch in the source', () => {
    expect(source).not.toMatch(/<select|<option|<optgroup/);
  });

  it('shows an error message and the danger border', () => {
    const { container, getByText } = render(Select, {
      props: { options: PLANS, error: 'Pick one' },
    });
    expect(getByText('Pick one').className).toContain('text-danger');
    expect(trigger(container).className).toContain('border-danger');
  });

  it('disables the trigger and the submitted value together', () => {
    const { container } = render(Select, {
      props: { name: 'plan', options: PLANS, disabled: true },
    });
    expect(trigger(container).disabled).toBe(true);
    expect((container.querySelector('input[type="hidden"]') as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it('fires onvaluechange after the hidden input holds the new value', async () => {
    // A page that submits on change reads the form in this callback, so the
    // value it posts has to be the one just picked.
    let posted = '';
    const { container } = render(Select, {
      props: {
        name: 'plan',
        options: PLANS,
        value: 'alpha',
        onvaluechange: () => {
          posted = (container.querySelector('input[name="plan"]') as HTMLInputElement).value;
        },
      },
    });
    await fireEvent.click(trigger(container));
    await fireEvent.click(rows(container)[1]);
    await vi.waitFor(() => expect(posted).toBe('beta'));
  });
});

describe('Select: the listbox', () => {
  it('renders a hidden input that carries the value', async () => {
    const { container } = render(Select, {
      props: { name: 'plan', options: PLANS, value: 'alpha' },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.name).toBe('plan');
    expect(hidden.value).toBe('alpha');

    await fireEvent.click(trigger(container));
    await fireEvent.click(rows(container)[1]);
    expect(hidden.value).toBe('beta');
  });

  it('takes its keyboard navigation from the shared listbox module', async () => {
    const { container } = render(Select, { props: { options: GROUPED } });
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
      props: { options: PLANS, onvaluechange },
    });
    await fireEvent.click(trigger(container));
    await fireEvent.click(rows(container)[1]);
    expect(onvaluechange).toHaveBeenCalledWith('beta');
  });

  it('names each group once and puts its rows inside it', async () => {
    const { container } = render(Select, { props: { options: GROUPED } });
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
      props: { options: PLANS, searchable: true, filter: byValue },
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
      props: { options: PLANS, searchable: true, filter: false },
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
      props: { options: withKeywords, searchable: true },
    });
    await fireEvent.click(trigger(container));
    const search = container.querySelector('input[type="text"]') as HTMLInputElement;

    await fireEvent.input(search, { target: { value: 'primary' } });
    expect(labels(container)).toEqual(['First']);
  });
});

describe('Select: icons and a custom trigger', () => {
  it('draws an option icon', async () => {
    const { container } = render(Select, { props: { options: ICONS } });
    await fireEvent.click(trigger(container));

    const [withIcon, without] = rows(container);
    expect(withIcon.querySelector('svg')).toBeTruthy();
    expect(without.querySelector('svg')).toBeNull();
  });

  it('hands the custom trigger the selected option and the open state', () => {
    const custom = createRawSnippet<[{ selected: SelectOption | undefined; open: boolean }]>(
      (arg) => ({
        render: () =>
          `<span data-testid="custom">${arg().selected?.label ?? 'nothing'} / ${arg().open ? 'open' : 'closed'}</span>`,
      }),
    );
    const { container, getByTestId } = render(Select, {
      props: { options: PLANS, value: 'beta', trigger: custom },
    });

    expect(getByTestId('custom').textContent).toBe('Second / closed');
    // It fills the trigger rather than replacing it, so the id, the label
    // association and the ARIA stay on one focusable element.
    expect(getByTestId('custom').closest('button')).toBe(trigger(container));
  });

  it('shows the placeholder when nothing is selected', () => {
    const { container } = render(Select, { props: { options: PLANS, placeholder: 'Pick a plan' } });
    expect(trigger(container).textContent).toContain('Pick a plan');
  });
});

describe('Select required marker', () => {
  const rows: SelectOption[] = [
    { value: 'free', label: 'Free' },
    { value: 'team', label: 'Team' },
  ];

  it('states the requirement on the trigger, not in its accessible name', () => {
    // The trigger carries aria-required, and combobox is a role that supports
    // it. The marker stays out of the name, so the field never announces as
    // "Plan required".
    const { container, getByRole } = render(Select, {
      props: { label: 'Plan', options: rows, required: true },
    });
    expect(getByRole('combobox', { name: 'Plan' })).toBeTruthy();
    const trigger = container.querySelector('[role="combobox"]') as HTMLElement;
    expect(trigger.getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });
});

describe('Select: dismissal', () => {
  it('closes the panel on Escape and puts focus back on the trigger', async () => {
    const { container } = render(Select, { props: { options: PLANS } });
    const button = trigger(container);

    await fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(button.getAttribute('aria-expanded')).toBe('true');

    await fireEvent.keyDown(button, { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(rows(container)).toEqual([]);
    expect(document.activeElement).toBe(button);
  });

  it('hands focus back from the search box, which is about to be unmounted', async () => {
    const { container } = render(Select, {
      props: { options: PLANS, searchable: true },
    });
    const button = trigger(container);
    await fireEvent.click(button);

    const search = container.querySelector('input[type="text"]') as HTMLInputElement;
    await fireEvent.keyDown(search, { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('stops Escape from reaching a modal around it', async () => {
    // Unstopped, one press closes both the panel and the surface holding it.
    // Consumed while closed, Escape would never reach the modal at all.
    const outer = vi.fn();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') outer();
    };
    document.addEventListener('keydown', onKeydown);
    try {
      const { container } = render(Select, { props: { options: PLANS } });
      const button = trigger(container);

      await fireEvent.keyDown(button, { key: 'ArrowDown' });
      await fireEvent.keyDown(button, { key: 'Escape' });
      expect(outer).not.toHaveBeenCalled();

      await fireEvent.keyDown(button, { key: 'Escape' });
      expect(outer).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', onKeydown);
    }
  });
});

describe('Select: panel placement', () => {
  it('hands the open panel to placePanel', async () => {
    // The surface used to sit under the trigger unconditionally, so a listbox
    // near the bottom of a modal opened into space that was not there. The
    // action marks the side it chose, and it needs the list marked to cap it.
    const { container } = render(Select, { props: { options: PLANS } });
    await fireEvent.click(trigger(container));

    const list = container.querySelector('[role="listbox"]') as HTMLElement;
    expect(list.hasAttribute('data-panel-list')).toBe(true);
    expect(list.style.maxHeight).toMatch(/^min\(var\(--spacing-panel-max\), \d+px\)$/);

    const surface = list.parentElement as HTMLElement;
    expect(surface.className).toMatch(/\btop-full\b|\bbottom-full\b/);
    expect(surface.className).not.toMatch(/\btop-full\b.*\bbottom-full\b/);
  });
});
