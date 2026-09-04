import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { FilterFn } from '../internal/filter.js';
import type { ListOption } from './Autocomplete.svelte';
import MultiSelect from './MultiSelect.svelte';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

/** Rows a user reaches by something other than the label. */
const AIRPORTS: ListOption[] = [
  { value: 'zrh', label: 'Zurich', keywords: ['ZRH', 'Switzerland'] },
  { value: 'gva', label: 'Genève' },
];

const source = readFileSync(join(__dirname, 'MultiSelect.svelte'), 'utf8');

/** The trigger and the panel's search box are both comboboxes; this is the trigger. */
function trigger(container: HTMLElement): HTMLElement {
  return container.querySelector('div[role="combobox"]') as HTMLElement;
}

function searchBox(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[role="combobox"]') as HTMLInputElement;
}

describe('MultiSelect', () => {
  it('shows the placeholder when nothing is selected', () => {
    const { getByText } = render(MultiSelect, {
      props: { options, value: [], placeholder: 'Choose tags' },
    });
    expect(getByText('Choose tags')).toBeTruthy();
  });

  it('opens the option list when the trigger is clicked', async () => {
    const { container, getAllByRole } = render(MultiSelect, { props: { options, value: [] } });
    await fireEvent.click(trigger(container));
    expect(getAllByRole('option')).toHaveLength(3);
  });

  it('fires onchange adding the toggled value', async () => {
    const onchange = vi.fn();
    const { container, getByText } = render(MultiSelect, {
      props: { options, value: [], onchange },
    });
    await fireEvent.click(trigger(container));
    await fireEvent.click(getByText('Alpha'));
    expect(onchange).toHaveBeenCalledWith(['a']);
  });

  it('renders a removable chip for each selected value', () => {
    const { getByLabelText } = render(MultiSelect, { props: { options, value: ['a'] } });
    expect(getByLabelText('Remove Alpha')).toBeTruthy();
  });

  it('fires onchange removing a value via its chip', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(MultiSelect, {
      props: { options, value: ['a', 'b'], onchange },
    });
    await fireEvent.click(getByLabelText('Remove Alpha'));
    expect(onchange).toHaveBeenCalledWith(['b']);
  });
});

describe('the trigger and the panel', () => {
  it('are linked by aria-controls and the panel id', async () => {
    // The trigger claimed aria-haspopup and aria-expanded while the panel had
    // no id at all, so the two stood unconnected in the accessibility tree.
    const { container } = render(MultiSelect, { props: { options } });
    const control = trigger(container);
    expect(control.getAttribute('aria-controls')).toBeNull();
    expect(control.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(control);
    const list = container.querySelector('[role="listbox"]') as HTMLElement;
    expect(list.id).not.toBe('');
    expect(control.getAttribute('aria-expanded')).toBe('true');
    expect(control.getAttribute('aria-controls')).toBe(list.id);
  });

  it('draws every id from $props.id(), never from a random number', () => {
    // A random id differs between the server render and hydration, so every
    // idref built from it names an element the client never rendered.
    expect(source).not.toMatch(/Math\.random/);

    const first = render(MultiSelect, { props: { options } });
    const second = render(MultiSelect, { props: { options } });
    expect(trigger(first.container).id).not.toBe('');
    expect(trigger(first.container).id).not.toBe(trigger(second.container).id);
  });

  it('says the list takes more than one value', async () => {
    const { container, getAllByRole } = render(MultiSelect, { props: { options, value: ['b'] } });
    await fireEvent.click(trigger(container));
    const list = container.querySelector('[role="listbox"]') as HTMLElement;
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    expect(getAllByRole('option').map((row) => row.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });
});

describe('the keyboard', () => {
  it('names the active row with aria-activedescendant', async () => {
    // Nothing in the kit set this, so a screen reader was never told which row
    // the arrows were resting on.
    const { container, getAllByRole } = render(MultiSelect, { props: { options } });
    const control = trigger(container);
    await fireEvent.click(control);

    const rows = getAllByRole('option');
    const search = searchBox(container);
    expect(search.getAttribute('aria-activedescendant')).toBe(rows[0].id);

    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toBe(rows[1].id);
    expect(control.getAttribute('aria-activedescendant')).toBe(rows[1].id);
  });

  it('picks the active row with Enter and leaves the list open for the next one', async () => {
    const onchange = vi.fn();
    const { container, getAllByRole } = render(MultiSelect, { props: { options, onchange } });
    await fireEvent.click(trigger(container));
    const search = searchBox(container);

    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    await fireEvent.keyDown(search, { key: 'Enter' });
    expect(onchange).toHaveBeenCalledWith(['b']);

    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    await fireEvent.keyDown(search, { key: 'Enter' });
    expect(onchange).toHaveBeenLastCalledWith(['b', 'c']);
    expect(getAllByRole('option')).toHaveLength(3);
  });

  it('opens the closed list from the trigger with Enter and with Space', async () => {
    for (const key of ['Enter', ' ']) {
      const { container, getAllByRole, unmount } = render(MultiSelect, { props: { options } });
      await fireEvent.keyDown(trigger(container), { key });
      expect(getAllByRole('option'), key).toHaveLength(3);
      unmount();
    }
  });

  it('keeps every option out of the tab sequence', async () => {
    // The rows shipped as plain buttons, so Tab stepped through every option
    // before it reached the next control.
    const { container, getAllByRole } = render(MultiSelect, { props: { options } });
    await fireEvent.click(trigger(container));
    for (const row of getAllByRole('option')) {
      expect(row.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('leaves the chip remove buttons their own keys', async () => {
    // The trigger took Enter from anything inside it, so a chip could not be
    // removed from the keyboard: the key opened the panel instead.
    const onchange = vi.fn();
    const { container, getByLabelText, queryAllByRole } = render(MultiSelect, {
      props: { options, value: ['a'], onchange },
    });
    const chip = getByLabelText('Remove Alpha');
    await fireEvent.keyDown(chip, { key: 'Enter' });
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});

describe('where focus goes', () => {
  it('moves into the search box on open and hands it back on Escape', async () => {
    // The search box carried a bare autofocus attribute behind a suppressed
    // warning, so focus went into the panel with nothing to bring it back out.
    expect(source).not.toMatch(/svelte-ignore/);

    const { container, queryAllByRole } = render(MultiSelect, { props: { options } });
    const control = trigger(container);
    await fireEvent.click(control);
    expect(searchBox(container).hasAttribute('autofocus')).toBe(false);
    expect(document.activeElement).toBe(searchBox(container));

    await fireEvent.keyDown(searchBox(container), { key: 'Escape' });
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(document.activeElement).toBe(control);
  });

  it('hands it back on Tab, rather than into a panel that is closing', async () => {
    const { container, queryAllByRole } = render(MultiSelect, { props: { options } });
    const control = trigger(container);
    await fireEvent.click(control);

    await fireEvent.keyDown(searchBox(container), { key: 'Tab' });
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(document.activeElement).toBe(control);
  });

  it('stays on the trigger when the field has no search box', async () => {
    const { container } = render(MultiSelect, { props: { options, searchable: false } });
    const control = trigger(container);
    control.focus();
    await fireEvent.click(control);
    expect(container.querySelector('input[role="combobox"]')).toBeNull();
    expect(document.activeElement).toBe(control);
  });
});

describe('dismissal', () => {
  it('closes on a pointer press outside the field', async () => {
    const { container, queryAllByRole } = render(MultiSelect, { props: { options } });
    await fireEvent.click(trigger(container));
    await fireEvent.pointerDown(document.body);
    expect(queryAllByRole('option')).toHaveLength(0);
  });

  it('stops Escape from reaching a modal around it', async () => {
    // Unstopped, one press closed the list and the modal holding it. Consumed
    // while closed, Escape would never reach the modal at all.
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    try {
      const { container, queryAllByRole } = render(MultiSelect, { props: { options } });
      const control = trigger(container);
      await fireEvent.click(control);

      await fireEvent.keyDown(searchBox(container), { key: 'Escape' });
      expect(queryAllByRole('option')).toHaveLength(0);
      expect(outer).not.toHaveBeenCalled();

      await fireEvent.keyDown(control, { key: 'Escape' });
      expect(outer).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', outer);
    }
  });

  it('empties the query it was dismissed with', async () => {
    const { container, getAllByRole } = render(MultiSelect, { props: { options } });
    const control = trigger(container);
    await fireEvent.click(control);
    await fireEvent.input(searchBox(container), { target: { value: 'gam' } });
    expect(getAllByRole('option')).toHaveLength(1);

    await fireEvent.keyDown(searchBox(container), { key: 'Escape' });
    await fireEvent.click(control);
    expect(searchBox(container).value).toBe('');
    expect(getAllByRole('option')).toHaveLength(3);
  });
});

describe('matching', () => {
  it('reads the keywords an option carries', async () => {
    const { container, getAllByRole } = render(MultiSelect, { props: { options: AIRPORTS } });
    await fireEvent.click(trigger(container));
    await fireEvent.input(searchBox(container), { target: { value: 'switz' } });
    const rows = getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Zurich');
  });

  it('folds the accent off a label rather than comparing raw code points', async () => {
    const { container, getAllByRole } = render(MultiSelect, { props: { options: AIRPORTS } });
    await fireEvent.click(trigger(container));
    await fireEvent.input(searchBox(container), { target: { value: 'geneve' } });
    expect(getAllByRole('option')[0].textContent).toContain('Genève');
  });

  it('takes a matcher from the caller', async () => {
    const byValue: FilterFn<ListOption> = (option, ctx) => option.value.startsWith(ctx.needle);
    const { container, getAllByRole } = render(MultiSelect, {
      props: { options, filter: byValue },
    });
    await fireEvent.click(trigger(container));
    await fireEvent.input(searchBox(container), { target: { value: 'c' } });
    const rows = getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Gamma');
  });

  it('leaves a list the caller has already narrowed alone', async () => {
    const { container, getAllByRole } = render(MultiSelect, {
      props: { options, filter: false },
    });
    await fireEvent.click(trigger(container));
    await fireEvent.input(searchBox(container), { target: { value: 'zzz' } });
    expect(getAllByRole('option')).toHaveLength(3);
  });
});

describe('the parts it no longer owns', () => {
  it('shares one option type with Autocomplete rather than declaring a second', () => {
    // The interface was written out in both files, character for character.
    expect(source).toContain("import type { ListOption } from './Autocomplete.svelte'");
    expect(source).not.toMatch(/interface Option\b/);
  });

  it('spells no filter expression of its own', () => {
    expect(source).toContain('applyFilter(');
    expect(source).not.toMatch(/toLowerCase\(\)/);
  });

  it('registers no document listener of its own', () => {
    // The dismiss effect was byte identical in three components, and each copy
    // left its capture listener on the document when the field unmounted open.
    expect(source).not.toMatch(/document\.addEventListener/);
    expect(source).toContain('use:anchor');
  });

  it('draws every panel class from the shared constants', () => {
    expect(source).toContain("from '../internal/panel.js'");
    expect(source).not.toMatch(/max-h-60|shadow-2xl/);
  });
});
