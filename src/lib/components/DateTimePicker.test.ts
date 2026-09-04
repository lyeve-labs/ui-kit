import { fireEvent, render, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import DateTimePicker from './DateTimePicker.svelte';

/**
 * Every block below is a way a datetime field built from two controls goes
 * wrong: a value that survives one direction only, a half that resets when its
 * neighbour changes, an empty field that claims to hold midnight, bounds
 * applied to each half instead of to the instant, a flag that stops at the
 * wrapper, three message rows under one field, and the timezone shift a single
 * `new Date(text)` puts into a date that never had a zone.
 */

/**
 * Only the members these helpers touch. Naming the full RenderResult ties the
 * file to the exact generic testing-library infers for a runes component, which
 * does not survive being written down.
 */
interface Rendered {
  container: HTMLElement;
  getByLabelText: (text: string) => HTMLElement;
  queryByLabelText: (text: string) => HTMLElement | null;
  queryAllByText: (text: string) => HTMLElement[];
}

/** The date half's trigger is the first button in the field. */
function dateTrigger(r: Rendered): HTMLButtonElement {
  return r.container.querySelector('button') as HTMLButtonElement;
}

function hourOf(r: Rendered): HTMLInputElement {
  return r.getByLabelText('Hour') as HTMLInputElement;
}

function minuteOf(r: Rendered): HTMLInputElement {
  return r.getByLabelText('Minute') as HTMLInputElement;
}

/** The one input a form posts. The halves carry no name, so the name selects it. */
function postedOf(r: Rendered, name: string): HTMLInputElement {
  return r.container.querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement;
}

describe('DateTimePicker value round trip', () => {
  it('fills both halves from one value and writes one back', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-04T15:30', name: 'published_at', onchange },
    });

    expect(dateTrigger(r).textContent).toContain('2026');
    expect(hourOf(r).value).toBe('15');
    expect(minuteOf(r).value).toBe('30');
    expect(postedOf(r, 'published_at').value).toBe('2026-03-04T15:30');

    await fireEvent.keyDown(minuteOf(r), { key: '4' });
    await fireEvent.keyDown(minuteOf(r), { key: '5' });

    expect(onchange).toHaveBeenLastCalledWith('2026-03-04T15:45');
    expect(postedOf(r, 'published_at').value).toBe('2026-03-04T15:45');
  });

  it('reads a bare date as that day with no clock reading', () => {
    // A date field's own value has this spelling, so a field promoted from a
    // date to a datetime is handed one. Blanking it would lose the day.
    const r = render(DateTimePicker, { props: { value: '2026-03-04', name: 'at' } });

    expect(dateTrigger(r).textContent).toContain('2026');
    expect(hourOf(r).value).toBe('');
    expect(postedOf(r, 'at').value).toBe('2026-03-04');
  });

  it('leaves both halves empty for a string that is not a value it writes', () => {
    // '04/03/2026' is a date to a reader and nothing to this field. Showing the
    // parts it can pick out of it would claim a value the field cannot emit.
    const r = render(DateTimePicker, { props: { value: '04/03/2026' } });

    expect(dateTrigger(r).textContent).toContain('Select a date');
    expect(hourOf(r).value).toBe('');
  });
});

describe('DateTimePicker keeps the half the user did not touch', () => {
  it('preserves the time when only the date changes', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-04T15:30', onchange },
    });

    await fireEvent.click(dateTrigger(r));
    await fireEvent.click(r.getByLabelText('2026-03-06'));
    await tick();

    expect(onchange).toHaveBeenLastCalledWith('2026-03-06T15:30');
    expect(hourOf(r).value).toBe('15');
    expect(minuteOf(r).value).toBe('30');
  });

  it('preserves the date when only the time changes', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-04T15:30', onchange },
    });

    await fireEvent.keyDown(hourOf(r), { key: 'ArrowUp' });
    await tick();

    expect(onchange).toHaveBeenLastCalledWith('2026-03-04T16:30');
    expect(dateTrigger(r).textContent).toContain('2026');
  });

  it('writes midnight for a day picked before any clock reading', async () => {
    // A day with no time is not a value this field can hold, and publishing
    // nothing would leave the calendar marking a day the consumer does not have.
    // Seeded from a bare date so the calendar opens on a known month: an empty
    // field opens on the month the machine running the test is in.
    const onchange = vi.fn();
    const r = render(DateTimePicker, { props: { value: '2026-03-04', onchange } });

    await fireEvent.click(dateTrigger(r));
    await fireEvent.click(r.getByLabelText('2026-03-06'));

    expect(onchange).toHaveBeenLastCalledWith('2026-03-06T00:00');
  });
});

describe('DateTimePicker empty value', () => {
  it('renders both halves empty rather than a default', () => {
    // Seeding either half from the clock would hand back a value the user never
    // chose the moment they touched the other one.
    const r = render(DateTimePicker, { props: { value: '', name: 'at' } });

    expect(dateTrigger(r).textContent).toContain('Select a date');
    expect(hourOf(r).value).toBe('');
    expect(minuteOf(r).value).toBe('');
    expect(postedOf(r, 'at').value).toBe('');
  });

  it('publishes nothing for a clock reading with no day', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, { props: { value: '', onchange } });

    await fireEvent.keyDown(hourOf(r), { key: '9' });
    await tick();

    // The hour stays on screen. There is simply no instant to name yet.
    expect(hourOf(r).value).toBe('09');
    expect(onchange).not.toHaveBeenCalled();
  });
});

describe('DateTimePicker bounds the whole instant', () => {
  const bounded = { min: '2026-03-04T09:00', max: '2026-03-06T17:00' };

  it('leaves the clock alone on a day between the bounds', async () => {
    // Eight in the morning on the fifth is after the min instant. Handing 09:00
    // to the time half on every day is the per-half clamp this field avoids.
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-05T08:00', ...bounded, onchange },
    });

    expect(hourOf(r).value).toBe('08');

    await fireEvent.keyDown(hourOf(r), { key: 'ArrowDown' });
    await tick();

    expect(hourOf(r).value).toBe('07');
    expect(onchange).toHaveBeenLastCalledWith('2026-03-05T07:00');
  });

  it('clamps to the min instant when the date moves onto the first allowed day', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-05T08:00', ...bounded, onchange },
    });

    await fireEvent.click(dateTrigger(r));
    await fireEvent.click(r.getByLabelText('2026-03-04'));
    await tick();

    expect(onchange).toHaveBeenLastCalledWith('2026-03-04T09:00');
    expect(hourOf(r).value).toBe('09');
  });

  it('clamps to the max instant when the date moves onto the last allowed day', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-05T20:00', ...bounded, onchange },
    });

    await fireEvent.click(dateTrigger(r));
    await fireEvent.click(r.getByLabelText('2026-03-06'));
    await tick();

    expect(onchange).toHaveBeenLastCalledWith('2026-03-06T17:00');
    expect(hourOf(r).value).toBe('17');
  });

  it('offers no day outside the bounds', async () => {
    const r = render(DateTimePicker, {
      props: { value: '2026-03-05T08:00', ...bounded },
    });

    await fireEvent.click(dateTrigger(r));

    expect((r.getByLabelText('2026-03-03') as HTMLButtonElement).disabled).toBe(true);
    expect((r.getByLabelText('2026-03-07') as HTMLButtonElement).disabled).toBe(true);
    expect((r.getByLabelText('2026-03-05') as HTMLButtonElement).disabled).toBe(false);
  });

  it('reads a bare date bound as the whole of that day', async () => {
    // Filling a max of a bare day with midnight would offer the day and then
    // refuse every time on it.
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-04T15:30', min: '2026-03-04', max: '2026-03-06', onchange },
    });

    await fireEvent.click(dateTrigger(r));
    await fireEvent.click(r.getByLabelText('2026-03-06'));
    await tick();

    expect(onchange).toHaveBeenLastCalledWith('2026-03-06T15:30');
  });
});

describe('DateTimePicker seconds flag', () => {
  it('reaches the time half', () => {
    const r = render(DateTimePicker, {
      props: { value: '2026-03-04T15:30:45', seconds: true },
    });

    expect((r.getByLabelText('Second') as HTMLInputElement).value).toBe('45');
  });

  it('carries seconds through a value the field writes', async () => {
    const onchange = vi.fn();
    const r = render(DateTimePicker, {
      props: { value: '2026-03-04T15:30:45', seconds: true, onchange },
    });

    await fireEvent.keyDown(minuteOf(r), { key: '4' });
    await fireEvent.keyDown(minuteOf(r), { key: '5' });

    expect(onchange).toHaveBeenLastCalledWith('2026-03-04T15:45:45');
  });

  it('draws no second segment without the flag', () => {
    const r = render(DateTimePicker, { props: { value: '2026-03-04T15:30:45' } });

    expect(r.queryByLabelText('Second')).toBeNull();
  });
});

describe('DateTimePicker never hands a string to the Date parser', () => {
  /**
   * Read from source rather than from the rendered output, the way the
   * consistency suite reads source. The defect is not something the component
   * displays: `new Date('2026-01-02')` is UTC midnight and
   * `new Date('2026-01-02T00:00')` is local midnight, so the day is off by one
   * only for a reader who is not on UTC. A rendering test written in one zone
   * passes on the code that carries the bug.
   */
  const SOURCE = readFileSync(join(__dirname, 'DateTimePicker.svelte'), 'utf8');

  /** The file states the rule in prose, so the prose has to come out before the check. */
  function code(src: string): string {
    return src
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  }

  it('constructs no Date and parses none', () => {
    const body = code(SOURCE);
    expect(body).not.toMatch(/new\s+Date\s*\(/);
    expect(body).not.toMatch(/Date\.parse\s*\(/);
  });

  it('keeps the prose that states the rule out of the check', () => {
    // The strip is only trustworthy if the doc comment it removes really is
    // there. Without this, deleting the explanation would make the test above
    // pass for the wrong reason.
    expect(SOURCE).toContain("new Date('2026-01-02')");
    expect(code(SOURCE)).not.toContain("new Date('2026-01-02')");
  });

  it('takes its date and time arithmetic from the modules that own it', () => {
    expect(SOURCE).toContain("from '../internal/calendar.js'");
    expect(SOURCE).toContain("from '../internal/time.js'");
  });

  it('states the value format', () => {
    expect(SOURCE).toContain("'2026-03-04T15:30'");
    expect(SOURCE).toContain("'2026-03-04T15:30:45'");
  });
});

describe('DateTimePicker field furniture', () => {
  it('states one label, one hint and one error for the pair', () => {
    // Both components mount into the same body, so every text query is scoped
    // to its own container. A query bound to the body counts the other one.
    const hinted = render(DateTimePicker, {
      props: { id: 'dt', value: '2026-03-04T15:30', label: 'Publish at', hint: 'Your local time' },
    }).container;

    expect(within(hinted).queryAllByText('Publish at')).toHaveLength(1);
    expect(within(hinted).queryAllByText('Your local time')).toHaveLength(1);
    expect(hinted.querySelectorAll('label')).toHaveLength(1);
    expect(hinted.querySelectorAll('p')).toHaveLength(1);

    const errored = render(DateTimePicker, {
      props: {
        id: 'dt2',
        value: '',
        label: 'Publish at',
        hint: 'Your local time',
        error: 'Pick a day and a time',
      },
    }).container;

    // The error replaces the hint rather than stacking with it, once, for both
    // halves together.
    expect(within(errored).queryAllByText('Pick a day and a time')).toHaveLength(1);
    expect(within(errored).queryAllByText('Your local time')).toHaveLength(0);
    expect(errored.querySelectorAll('label')).toHaveLength(1);
    expect(errored.querySelectorAll('p')).toHaveLength(1);
  });

  it('names the pair once and points the label at the date trigger', () => {
    const r = render(DateTimePicker, {
      props: { id: 'dt', value: '2026-03-04T15:30', label: 'Publish at', hint: 'Your local time' },
    });

    const label = r.container.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe('dt-date');
    // A button is labelable, so the field's own label names the trigger and
    // clicking it opens the calendar.
    expect(r.container.querySelector('#dt-date')?.tagName).toBe('BUTTON');

    const group = r.container.querySelector('[aria-labelledby="dt-label"]') as HTMLElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-describedby')).toBe('dt-hint');
    expect(group.getAttribute('aria-label')).toBeNull();
  });

  it('reports its error on the group, because it belongs to neither half', () => {
    const r = render(DateTimePicker, {
      props: { id: 'dt', value: '', label: 'Publish at', error: 'Pick a day and a time' },
    });

    const group = r.container.querySelector('[aria-labelledby="dt-label"]') as HTMLElement;
    expect(group.getAttribute('aria-describedby')).toBe('dt-error');
    expect(r.container.querySelector('#dt-error')?.textContent).toBe('Pick a day and a time');
    // ARIA does not allow aria-invalid on a group, so the message is the whole
    // of what a reader is told. Neither half may state it on its own: two
    // controls each reporting the same error is what this field replaces.
    expect(group.getAttribute('aria-invalid')).toBeNull();
    expect(r.container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it('names the group itself when the field carries no label', () => {
    const r = render(DateTimePicker, { props: { value: '2026-03-04T15:30' } });

    const group = r.container.querySelector('[role="group"]') as HTMLElement;
    expect(group.getAttribute('aria-label')).toBe('Date and time');
    expect(r.container.querySelectorAll('label')).toHaveLength(0);
  });
});

describe('DateTimePicker required marker', () => {
  it('states the requirement on both halves, not in the group name', () => {
    // The marker carried aria-label="required" inside the label, which names
    // both the group and the date trigger, so the field announced as "When
    // required". The component owns no control of its own: it forwards
    // `required` to the two halves, and each states it where it can.
    const { container, getByRole, getByLabelText } = render(DateTimePicker, {
      props: { label: 'When', required: true },
    });
    expect(getByRole('group', { name: 'When' })).toBeTruthy();
    // The date half's trigger is a combobox: aria-required is not a property
    // ARIA gives button, so the role changed under it and the query follows.
    const trigger = getByRole('combobox', { name: 'When' }) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect((getByLabelText('Hour') as HTMLElement).getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });
});
