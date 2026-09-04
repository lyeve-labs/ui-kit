import { fireEvent, render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { FilterFn } from '../internal/filter.js';
import Autocomplete, { type ListOption } from './Autocomplete.svelte';

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

const source = readFileSync(join(__dirname, 'Autocomplete.svelte'), 'utf8');

function combobox(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[role="combobox"]') as HTMLInputElement;
}

describe('Autocomplete', () => {
  it('renders a label and a combobox input', () => {
    const { container, getByText } = render(Autocomplete, {
      props: { options, label: 'Fruit' },
    });
    expect(getByText('Fruit')).toBeTruthy();
    expect(container.querySelector('[role="combobox"]')).toBeTruthy();
  });

  it('opens the option list on focus', async () => {
    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    await fireEvent.focus(container.querySelector('[role="combobox"]') as HTMLInputElement);
    expect(getAllByRole('option')).toHaveLength(3);
  });

  it('displays the selected option label in the input', () => {
    const { container } = render(Autocomplete, { props: { options, value: 'b' } });
    expect((container.querySelector('[role="combobox"]') as HTMLInputElement).value).toBe('Beta');
  });

  it('fires onchange with the chosen value when an option is clicked', async () => {
    const onchange = vi.fn();
    const { container, getByText } = render(Autocomplete, { props: { options, onchange } });
    await fireEvent.focus(container.querySelector('[role="combobox"]') as HTMLInputElement);
    await fireEvent.click(getByText('Gamma'));
    expect(onchange).toHaveBeenCalledWith('c');
  });

  it('filters options as the user types', async () => {
    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    const input = container.querySelector('[role="combobox"]') as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'be' } });
    const opts = getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0].textContent).toContain('Beta');
  });

  it('clears the selection via the clear button', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(Autocomplete, { props: { options, value: 'b', onchange } });
    await fireEvent.click(getByLabelText('Clear'));
    expect(onchange).toHaveBeenCalledWith('');
  });
});

describe('the ids it emits', () => {
  it('draws them from $props.id(), never from a random number', async () => {
    // A random id is one string on the server and another after hydration, so
    // the aria-controls this field emitted named an element the client had
    // never rendered.
    expect(source).not.toMatch(/Math\.random/);

    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    const input = combobox(container);
    await fireEvent.focus(input);

    const list = container.querySelector('[role="listbox"]') as HTMLElement;
    expect(list.id).not.toBe('');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(getAllByRole('option')[0].id).toContain(list.id.replace(/-list$/, ''));
  });

  it('names nothing while the list is closed', () => {
    // Both attributes point at elements that exist only while the panel is
    // mounted, and a dangling idref announces as nothing at all.
    const { container } = render(Autocomplete, { props: { options } });
    const input = combobox(container);
    expect(input.getAttribute('aria-controls')).toBeNull();
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('gives two instances on one page different ids', () => {
    const first = render(Autocomplete, { props: { options } });
    const second = render(Autocomplete, { props: { options } });
    expect(combobox(first.container).id).not.toBe(combobox(second.container).id);
  });
});

describe('the active row', () => {
  it('is named by aria-activedescendant as the keyboard moves it', async () => {
    // Nothing in the kit set this, so a screen reader was never told which row
    // the arrow keys were resting on.
    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    const input = combobox(container);
    await fireEvent.focus(input);

    const rows = getAllByRole('option');
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[0].id);

    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[1].id);

    await fireEvent.keyDown(input, { key: 'End' });
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[2].id);
  });

  it('opens on the row the field already holds', async () => {
    const { container, getAllByRole } = render(Autocomplete, { props: { options, value: 'c' } });
    const input = combobox(container);
    await fireEvent.focus(input);
    expect(input.getAttribute('aria-activedescendant')).toBe(getAllByRole('option')[2].id);
  });
});

describe('the tab sequence', () => {
  it('leaves the field rather than walking the rows', async () => {
    // The rows shipped as plain buttons, so Tab stepped through every option
    // before it reached the next control.
    const { container, getAllByRole } = render(Autocomplete, { props: { options } });
    await fireEvent.focus(combobox(container));
    for (const row of getAllByRole('option')) {
      expect(row.getAttribute('tabindex')).toBe('-1');
    }
  });
});

describe('dismissal', () => {
  it('keeps the panel open when focus lands on a row, and schedules nothing', async () => {
    // The panel closed on a 150ms blur timer, so clicking an option worked
    // only because mousedown to click beat the timer.
    const onchange = vi.fn();
    const { container, getAllByRole } = render(Autocomplete, { props: { options, onchange } });
    const input = combobox(container);
    await fireEvent.focus(input);

    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const row = getAllByRole('option')[2];
    await fireEvent.focusOut(input, { relatedTarget: row });

    expect(getAllByRole('option')).toHaveLength(3);
    await fireEvent.click(row);
    expect(onchange).toHaveBeenCalledWith('c');
    expect(timeout).not.toHaveBeenCalled();
    timeout.mockRestore();
  });

  it('closes when focus leaves the field for something outside it', async () => {
    const { container, queryAllByRole } = render(Autocomplete, { props: { options } });
    const input = combobox(container);
    await fireEvent.focus(input);
    await fireEvent.focusOut(input, { relatedTarget: document.body });
    expect(queryAllByRole('option')).toHaveLength(0);
  });

  it('closes on a pointer press outside the field', async () => {
    const { container, queryAllByRole } = render(Autocomplete, { props: { options } });
    await fireEvent.focus(combobox(container));
    await fireEvent.pointerDown(document.body);
    expect(queryAllByRole('option')).toHaveLength(0);
  });

  it('stops Escape from reaching a modal around it', async () => {
    // Unstopped, one press closed the list and the modal holding it. Consumed
    // while closed, Escape would never reach the modal at all.
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    try {
      const { container, queryAllByRole } = render(Autocomplete, { props: { options } });
      const input = combobox(container);
      // Focused for real rather than fired at: Escape hands focus back to the
      // input, and where the caret already is decides whether that is a move.
      input.focus();

      await fireEvent.keyDown(input, { key: 'Escape' });
      expect(queryAllByRole('option')).toHaveLength(0);
      expect(outer).not.toHaveBeenCalled();

      await fireEvent.keyDown(input, { key: 'Escape' });
      expect(outer).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', outer);
    }
  });

  it('puts the query away and shows the chosen label again', async () => {
    const { container, queryAllByRole } = render(Autocomplete, { props: { options, value: 'b' } });
    const input = combobox(container);
    input.focus();
    await fireEvent.input(input, { target: { value: 'gam' } });
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(input.value).toBe('Beta');
  });
});

describe('matching', () => {
  it('reads the keywords an option carries', async () => {
    const { container, getAllByRole } = render(Autocomplete, { props: { options: AIRPORTS } });
    const input = combobox(container);
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'switz' } });
    const rows = getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Zurich');
  });

  it('folds the accent off a label rather than comparing raw code points', async () => {
    // The hand-rolled expression lowercased and nothing else, so a query of
    // "geneve" missed the option it was typing toward.
    const { container, getAllByRole } = render(Autocomplete, { props: { options: AIRPORTS } });
    const input = combobox(container);
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'geneve' } });
    expect(getAllByRole('option')[0].textContent).toContain('Genève');
  });

  it('takes a matcher from the caller', async () => {
    const byValue: FilterFn<ListOption> = (option, ctx) => option.value.startsWith(ctx.needle);
    const { container, getAllByRole } = render(Autocomplete, {
      props: { options, filter: byValue },
    });
    const input = combobox(container);
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'c' } });
    const rows = getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Gamma');
  });

  it('leaves a list the caller has already narrowed alone', async () => {
    // filter={false} is for a list a server query cut: a keystroke still in the
    // box must not narrow it a second time.
    const { container, getAllByRole } = render(Autocomplete, {
      props: { options, filter: false },
    });
    const input = combobox(container);
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'zzz' } });
    expect(getAllByRole('option')).toHaveLength(3);
  });
});

describe('the parts it no longer owns', () => {
  it('spells no filter expression of its own', () => {
    expect(source).toContain('applyFilter(');
    expect(source).not.toMatch(/toLowerCase\(\)/);
  });

  it('registers no document listener and starts no timer', () => {
    // The dismiss effect was copied between four controls, and this copy was
    // the one missing the keydown, so Escape did nothing here at all.
    expect(source).not.toMatch(/document\.addEventListener/);
    expect(source).not.toMatch(/setTimeout/);
    expect(source).toContain('use:anchor');
  });

  it('draws every panel class from the shared constants', () => {
    expect(source).toContain("from '../internal/panel.js'");
    expect(source).not.toMatch(/max-h-60|shadow-2xl|border-line\b/);
  });
});
