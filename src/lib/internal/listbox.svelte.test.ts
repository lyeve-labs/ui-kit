import { fireEvent } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createListbox,
  type Listbox,
  type ListboxCloseReason,
  type ListboxItem,
} from './listbox.svelte.js';

/**
 * Every case here is one of the defects the four hand-rolled lists shipped.
 * The keyboard model is the whole point of the module, so the cases that matter
 * are the ones a user reaches with a key: opening upward, the ends of the list,
 * the rows that refuse to be chosen, and the two events (Enter and Escape) that
 * belong to the form and the modal around the field when the list is closed.
 */

const BASE_ID = 'fld';

/** Four rows, all choosable. */
const PLAIN: ListboxItem[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
];

/** Disabled at both ends and in the middle, so no edge case is the same shape. */
const GAPPED: ListboxItem[] = [
  { value: 'a', label: 'Alpha', disabled: true },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie', disabled: true },
  { value: 'd', label: 'Delta' },
  { value: 'e', label: 'Echo', disabled: true },
];

/**
 * Three labels share a first letter and one starts with the second letter of
 * the run, so accumulating "ne" and cycling "n" land on different rows.
 */
const COUNTRIES: ListboxItem[] = [
  { value: 'ee', label: 'Estonia' },
  { value: 'na', label: 'Namibia' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'np', label: 'Nepal' },
];

interface Fixture {
  box: Listbox;
  wrapper: HTMLElement;
  trigger: HTMLButtonElement;
  outside: HTMLButtonElement;
  opens: boolean[];
  closes: ListboxCloseReason[];
  picks: { value: string; index: number }[];
  setItems(next: ListboxItem[]): void;
  mountPanel(): HTMLElement;
  destroy(): void;
}

function fixture(
  initial: ListboxItem[] = PLAIN,
  options: { typeahead?: boolean; loop?: boolean } = {},
): Fixture {
  let items = initial;
  const opens: boolean[] = [];
  const closes: ListboxCloseReason[] = [];
  const picks: { value: string; index: number }[] = [];

  const box = createListbox<ListboxItem>({
    items: () => items,
    baseId: () => BASE_ID,
    onSelect: (item, index) => picks.push({ value: item.value, index }),
    onOpenChange: (open) => opens.push(open),
    onClose: (reason) => closes.push(reason),
    typeahead: () => options.typeahead ?? false,
    loop: () => options.loop ?? false,
  });

  const wrapper = document.createElement('div');
  const trigger = document.createElement('button');
  trigger.textContent = 'Open';
  wrapper.appendChild(trigger);

  const outside = document.createElement('button');
  outside.textContent = 'Elsewhere';

  document.body.append(wrapper, outside);
  const anchor = box.anchor(wrapper);
  let panel: { destroy(): void } | null = null;

  return {
    box,
    wrapper,
    trigger,
    outside,
    opens,
    closes,
    picks,
    setItems(next) {
      items = next;
    },
    mountPanel() {
      const node = document.createElement('div');
      node.id = String(box.listAttrs.id);
      node.setAttribute('role', String(box.listAttrs.role));
      items.forEach((item, index) => {
        const attrs = box.optionAttrs(index);
        const row = document.createElement('div');
        row.id = String(attrs.id);
        row.setAttribute('role', String(attrs.role));
        row.tabIndex = Number(attrs.tabindex);
        row.textContent = item.label;
        node.appendChild(row);
      });
      wrapper.appendChild(node);
      panel = box.panel(node);
      return node;
    },
    destroy() {
      panel?.destroy();
      anchor.destroy();
    },
  };
}

interface Pressed {
  consumed: boolean;
  prevented: boolean;
  stopped: boolean;
}

function press(box: Listbox, key: string, init: KeyboardEventInit = {}): Pressed {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  const stopPropagation = vi.spyOn(event, 'stopPropagation');
  const consumed = box.onkeydown(event);
  return {
    consumed,
    prevented: event.defaultPrevented,
    stopped: stopPropagation.mock.calls.length > 0,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('opening', () => {
  it('opens on ArrowDown at the first enabled row', () => {
    const f = fixture(GAPPED);
    expect(press(f.box, 'ArrowDown')).toMatchObject({ consumed: true, prevented: true });
    expect(f.box.open).toBe(true);
    expect(f.box.activeIndex).toBe(1);
    f.destroy();
  });

  it('ArrowUp on a closed list opens it at the last enabled row', () => {
    // Autocomplete decremented a hidden index and opened nothing, so the first
    // ArrowUp did nothing visible and the second opened the list somewhere the
    // user had not asked for.
    const f = fixture(GAPPED);
    const result = press(f.box, 'ArrowUp');
    expect(result.consumed).toBe(true);
    expect(result.prevented).toBe(true);
    expect(f.box.open).toBe(true);
    expect(f.box.activeIndex).toBe(3);
    f.destroy();
  });

  it('never makes a disabled row the initial active row', () => {
    const f = fixture(GAPPED);
    f.box.openList();
    expect(f.box.activeIndex).toBe(1);
    f.destroy();
  });

  it('reports one open change per transition', () => {
    const f = fixture();
    f.box.openList();
    f.box.openList();
    f.box.close('outside');
    f.box.close('outside');
    expect(f.opens).toEqual([true, false]);
    expect(f.closes).toEqual(['outside']);
    f.destroy();
  });

  it('toggles from the trigger', () => {
    const f = fixture();
    f.box.toggle();
    expect(f.box.open).toBe(true);
    f.box.toggle();
    expect(f.box.open).toBe(false);
    f.destroy();
  });
});

describe('moving through the list', () => {
  const MOVES: [string, string, number, number][] = [
    ['Home goes to the first enabled row', 'Home', 3, 1],
    ['End goes to the last enabled row', 'End', 1, 3],
    ['ArrowDown skips a disabled row', 'ArrowDown', 1, 3],
    ['ArrowUp skips a disabled row', 'ArrowUp', 3, 1],
  ];

  it.each(MOVES)('%s', (_name, key, from, expected) => {
    const f = fixture(GAPPED);
    f.box.openList(from);
    expect(press(f.box, key)).toMatchObject({ consumed: true, prevented: true });
    expect(f.box.activeIndex).toBe(expected);
    f.destroy();
  });

  it('leaves Home and End alone while the list is closed', () => {
    // In a combobox input those two keys belong to the caret.
    const f = fixture();
    for (const key of ['Home', 'End']) {
      const result = press(f.box, key);
      expect(result.consumed, key).toBe(false);
      expect(result.prevented, key).toBe(false);
    }
    expect(f.box.open).toBe(false);
    f.destroy();
  });

  it('refuses to make a disabled row active from the pointer', () => {
    const f = fixture(GAPPED);
    f.box.openList(1);
    f.box.setActive(2);
    expect(f.box.activeIndex).toBe(1);
    f.box.setActive(3);
    expect(f.box.activeIndex).toBe(3);
    f.destroy();
  });
});

describe('the ends of the list', () => {
  const ENDS: [string, boolean, string, number, number][] = [
    ['loop off holds at the last enabled row', false, 'ArrowDown', 3, 3],
    ['loop off holds at the first enabled row', false, 'ArrowUp', 1, 1],
    ['loop on wraps past the end to the first enabled row', true, 'ArrowDown', 3, 1],
    ['loop on wraps past the start to the last enabled row', true, 'ArrowUp', 1, 3],
  ];

  it.each(ENDS)('%s', (_name, loop, key, from, expected) => {
    const f = fixture(GAPPED, { loop });
    f.box.openList(from);
    press(f.box, key);
    expect(f.box.activeIndex).toBe(expected);
    f.destroy();
  });
});

describe('Enter', () => {
  it('is consumed only when the list is open', () => {
    // A closed list must leave Enter alone or the form it sits in cannot be
    // submitted from the field.
    const f = fixture();
    const closed = press(f.box, 'Enter');
    expect(closed).toMatchObject({ consumed: false, prevented: false });
    expect(f.picks).toEqual([]);

    f.box.openList(2);
    const opened = press(f.box, 'Enter');
    expect(opened).toMatchObject({ consumed: true, prevented: true });
    expect(f.picks).toEqual([{ value: 'c', index: 2 }]);
    f.destroy();
  });

  it('consumes nothing when the open list has no row to choose', () => {
    const f = fixture([]);
    f.box.openList();
    expect(press(f.box, 'Enter')).toMatchObject({ consumed: false, prevented: false });
    expect(f.picks).toEqual([]);
    f.destroy();
  });

  it('leaves the list open, so several values can be picked in one pass', () => {
    const f = fixture();
    f.box.openList(0);
    press(f.box, 'Enter');
    press(f.box, 'ArrowDown');
    press(f.box, 'Enter');
    expect(f.box.open).toBe(true);
    expect(f.picks).toEqual([
      { value: 'a', index: 0 },
      { value: 'b', index: 1 },
    ]);
    f.destroy();
  });
});

describe('Escape', () => {
  it('is consumed only when the list is open', () => {
    // Unstopped, one press closed the listbox and the modal holding it.
    // Consumed while closed, Escape never reached the modal at all.
    const f = fixture();
    const closed = press(f.box, 'Escape');
    expect(closed).toMatchObject({ consumed: false, prevented: false, stopped: false });

    f.box.openList();
    const opened = press(f.box, 'Escape');
    expect(opened).toMatchObject({ consumed: true, prevented: true, stopped: true });
    expect(f.box.open).toBe(false);
    expect(f.closes).toEqual(['escape']);
    f.destroy();
  });

  it('returns focus to the trigger', () => {
    const f = fixture();
    f.box.openList();
    f.outside.focus();
    press(f.box, 'Escape');
    expect(document.activeElement).toBe(f.trigger);
    f.destroy();
  });
});

describe('Tab', () => {
  it('closes the list without preventing the default, so focus leaves the field', () => {
    const f = fixture();
    expect(press(f.box, 'Tab')).toMatchObject({ consumed: false, prevented: false });
    expect(f.closes).toEqual([]);

    f.box.openList();
    const result = press(f.box, 'Tab');
    expect(result.prevented).toBe(false);
    expect(result.consumed).toBe(false);
    expect(f.box.open).toBe(false);
    expect(f.closes).toEqual(['tab']);
    f.destroy();
  });

  it('keeps every row out of the tab sequence', () => {
    // The rows shipped as plain buttons, so Tab walked into the list and a user
    // leaving a field with eighty options pressed it eighty-one times.
    const f = fixture();
    expect(f.box.optionAttrs(0).tabindex).toBe(-1);
    expect(f.box.optionAttrs(3).tabindex).toBe(-1);
    f.destroy();
  });
});

describe('typeahead', () => {
  it('is off unless the control asks for it', () => {
    // Letters are query text in a combobox with its own input.
    const f = fixture(COUNTRIES);
    f.box.openList(0);
    expect(press(f.box, 'e')).toMatchObject({ consumed: false, prevented: false });
    expect(f.box.activeIndex).toBe(0);
    f.destroy();
  });

  it('accumulates a two-letter run rather than cycling the first letter', () => {
    // The second letter extends the run. Read on its own it would cycle to
    // Estonia instead, which is what the reset case below shows.
    const f = fixture(COUNTRIES, { typeahead: true });
    f.box.openList(0);
    expect(press(f.box, 'n')).toMatchObject({ consumed: true, prevented: true });
    expect(f.box.activeIndex).toBe(1);
    press(f.box, 'e');
    expect(f.box.activeIndex).toBe(2);
    f.destroy();
  });

  it('starts a new run after the window closes', () => {
    vi.useFakeTimers();
    const f = fixture(COUNTRIES, { typeahead: true });
    f.box.openList(0);
    press(f.box, 'n');
    press(f.box, 'e');
    expect(f.box.activeIndex).toBe(2);

    vi.advanceTimersByTime(600);
    press(f.box, 'e');
    expect(f.box.activeIndex).toBe(0);
    f.destroy();
  });

  it('cycles the rows sharing a letter when the run is one character', () => {
    vi.useFakeTimers();
    const f = fixture(COUNTRIES, { typeahead: true });
    f.box.openList(0);
    press(f.box, 'n');
    expect(f.box.activeIndex).toBe(1);
    vi.advanceTimersByTime(600);
    press(f.box, 'n');
    expect(f.box.activeIndex).toBe(2);
    f.destroy();
  });

  it('opens a closed list on the first character', () => {
    const f = fixture(COUNTRIES, { typeahead: true });
    press(f.box, 'n');
    expect(f.box.open).toBe(true);
    expect(f.box.activeIndex).toBe(1);
    f.destroy();
  });

  it('leaves a bare space to the trigger and takes one inside a run', () => {
    const f = fixture(
      [
        { value: 'ny', label: 'New York' },
        { value: 'nj', label: 'Newark' },
      ],
      { typeahead: true },
    );
    f.box.openList(0);
    expect(press(f.box, ' ')).toMatchObject({ consumed: false, prevented: false });
    press(f.box, 'n');
    press(f.box, 'e');
    press(f.box, 'w');
    press(f.box, ' ');
    press(f.box, 'y');
    expect(f.box.activeIndex).toBe(0);
    f.destroy();
  });

  it('skips a disabled row', () => {
    const f = fixture(
      [
        { value: 'x', label: 'Bravo', disabled: true },
        { value: 'y', label: 'Bravado' },
      ],
      { typeahead: true },
    );
    f.box.openList();
    press(f.box, 'b');
    expect(f.box.activeIndex).toBe(1);
    f.destroy();
  });
});

describe('the attributes it hands out', () => {
  it('builds a stable id from the base id', () => {
    const f = fixture();
    expect(f.box.optionAttrs(2).id).toBe(`${BASE_ID}-option-2`);
    expect(f.box.optionAttrs(2).id).toBe(f.box.optionAttrs(2).id);
    expect(f.box.listAttrs.id).toBe(`${BASE_ID}-list`);
    f.destroy();
  });

  it('draws no id from a random number', () => {
    // A random id differs between the server render and hydration, so every
    // aria-controls and aria-activedescendant built from it points at an
    // element the client never rendered.
    const src = readFileSync(join(__dirname, 'listbox.svelte.ts'), 'utf8');
    expect(src).not.toMatch(/Math\.random/);
  });

  it('names the active row, and names nothing while the list is closed', () => {
    const f = fixture();
    expect(f.box.triggerAttrs['aria-activedescendant']).toBeUndefined();
    expect(f.box.triggerAttrs['aria-controls']).toBeUndefined();
    expect(f.box.triggerAttrs['aria-expanded']).toBe('false');

    f.box.openList(1);
    expect(f.box.triggerAttrs['aria-expanded']).toBe('true');
    expect(f.box.triggerAttrs['aria-controls']).toBe(f.box.listAttrs.id);
    expect(f.box.triggerAttrs['aria-activedescendant']).toBe(f.box.optionAttrs(1).id);

    press(f.box, 'ArrowDown');
    expect(f.box.triggerAttrs['aria-activedescendant']).toBe(f.box.optionAttrs(2).id);
    f.destroy();
  });

  it('marks a row that cannot be chosen', () => {
    const f = fixture(GAPPED);
    expect(f.box.optionAttrs(0)['aria-disabled']).toBe('true');
    expect(f.box.optionAttrs(1)['aria-disabled']).toBeUndefined();
    expect(f.box.optionAttrs(1).role).toBe('option');
    f.destroy();
  });

  it('clamps an active row the list has shrunk below', () => {
    // A filter narrowing the list left the index past the end, and
    // aria-activedescendant then named an element that was never rendered.
    const f = fixture();
    f.box.openList(3);
    expect(f.box.activeIndex).toBe(3);

    f.setItems(PLAIN.slice(0, 2));
    expect(f.box.activeIndex).toBe(1);
    expect(f.box.triggerAttrs['aria-activedescendant']).toBe(`${BASE_ID}-option-1`);

    f.setItems([]);
    expect(f.box.activeIndex).toBe(-1);
    expect(f.box.triggerAttrs['aria-activedescendant']).toBeUndefined();
    f.destroy();
  });
});

describe('dismissal', () => {
  it('closes on a press outside the field', async () => {
    const f = fixture();
    f.box.openList();
    await fireEvent.pointerDown(f.outside);
    expect(f.box.open).toBe(false);
    expect(f.closes).toEqual(['outside']);
    f.destroy();
  });

  it('stays open for a press on the trigger or inside the panel', async () => {
    const f = fixture();
    f.box.openList();
    const panel = f.mountPanel();
    await fireEvent.pointerDown(f.trigger);
    expect(f.box.open).toBe(true);
    await fireEvent.pointerDown(panel.querySelector('[role="option"]') as HTMLElement);
    expect(f.box.open).toBe(true);
    f.destroy();
  });

  it('closes when focus lands outside the field', async () => {
    const f = fixture();
    f.box.openList();
    await fireEvent.focusOut(f.trigger, { relatedTarget: f.outside });
    expect(f.box.open).toBe(false);
    expect(f.closes).toEqual(['focusout']);
    f.destroy();
  });

  it('stays open when focus moves into the panel', async () => {
    // The 150ms blur timer this replaces made a click on an option work only
    // because mousedown-to-click beat the timer.
    const f = fixture();
    f.box.openList();
    const panel = f.mountPanel();
    await fireEvent.focusOut(f.trigger, {
      relatedTarget: panel.querySelector('[role="option"]'),
    });
    expect(f.box.open).toBe(true);
    f.destroy();
  });

  it('schedules nothing', () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const f = fixture();
    f.box.openList();
    press(f.box, 'ArrowDown');
    f.box.close('outside');
    expect(timeout).not.toHaveBeenCalled();
    f.destroy();
  });

  it('takes its document listener away with the field', async () => {
    // The four copies added the listener from an effect and removed it from the
    // same effect's teardown, so a control unmounted while open left a capture
    // listener on the document for the life of the page.
    const f = fixture();
    f.box.openList();
    f.destroy();
    await fireEvent.pointerDown(f.outside);
    expect(f.closes).toEqual([]);
  });
});

describe('keeping the active row in view', () => {
  it('scrolls it no further than it has to', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const f = fixture();
    f.box.openList(0);
    f.mountPanel();
    f.box.setActive(3);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    f.destroy();
  });

  it('survives a document that cannot scroll an element into view', () => {
    const original = Element.prototype.scrollIntoView;
    // @ts-expect-error the property is being removed, which is the case under test
    delete Element.prototype.scrollIntoView;

    const f = fixture();
    f.box.openList(0);
    expect(() => f.mountPanel()).not.toThrow();
    expect(() => f.box.setActive(2)).not.toThrow();
    f.destroy();

    Element.prototype.scrollIntoView = original;
  });
});
