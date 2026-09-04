import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TimePicker from './TimePicker.svelte';

/**
 * Every block below is a way a segmented time field goes wrong: a minute that
 * carries into the hour, a 12-hour clock with an hour zero, per-segment
 * clamping that rewrites a legal time, a range that cannot say "overnight", a
 * display value posted to the server, and an empty field that claims to hold
 * midnight.
 */

/**
 * Only the two members these helpers touch. Naming the full RenderResult ties
 * the file to the exact generic testing-library infers for a runes component,
 * which does not survive being written down.
 */
interface Rendered {
  container: HTMLElement;
  getByLabelText: (text: string) => HTMLElement;
}

function hourOf(r: Rendered): HTMLInputElement {
  return r.getByLabelText('Hour') as HTMLInputElement;
}

function minuteOf(r: Rendered): HTMLInputElement {
  return r.getByLabelText('Minute') as HTMLInputElement;
}

function hiddenOf(r: Rendered): HTMLInputElement {
  return r.container.querySelector('input[type="hidden"]') as HTMLInputElement;
}

describe('TimePicker value round trip', () => {
  it('fills the segments from a 24-hour value and writes one back', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '09:30', onchange } });

    expect(hourOf(r).value).toBe('09');
    expect(minuteOf(r).value).toBe('30');

    await fireEvent.keyDown(minuteOf(r), { key: '4' });
    await fireEvent.keyDown(minuteOf(r), { key: '5' });

    expect(minuteOf(r).value).toBe('45');
    expect(onchange).toHaveBeenLastCalledWith('09:45');
    expect(hiddenOf(r).value).toBe('09:45');
  });

  it('fills the segments from a 12-hour display and writes 24-hour back', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '21:05', hour12: true, onchange } });

    expect(hourOf(r).value).toBe('09');
    expect(minuteOf(r).value).toBe('05');
    expect((r.getByLabelText('AM or PM') as HTMLSelectElement).value).toBe('PM');

    await fireEvent.change(r.getByLabelText('AM or PM'), { target: { value: 'AM' } });

    expect(hourOf(r).value).toBe('09');
    expect(onchange).toHaveBeenLastCalledWith('09:05');
  });

  it('round-trips a value with seconds', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '09:30:15', seconds: true, onchange } });

    expect((r.getByLabelText('Second') as HTMLInputElement).value).toBe('15');

    await fireEvent.keyDown(r.getByLabelText('Second'), { key: '0' });
    await fireEvent.keyDown(r.getByLabelText('Second'), { key: '7' });

    expect(onchange).toHaveBeenLastCalledWith('09:30:07');
  });

  it('drops the second segment from the value when seconds is off', () => {
    const r = render(TimePicker, { props: { value: '09:30:15' } });
    expect(r.queryByLabelText('Second')).toBeNull();
    expect(hiddenOf(r).value).toBe('09:30:15');
  });
});

describe('TimePicker 12-hour display', () => {
  it('renders midnight as 12 AM, not as hour zero', () => {
    const r = render(TimePicker, { props: { value: '00:00', hour12: true } });
    expect(hourOf(r).value).toBe('12');
    expect((r.getByLabelText('AM or PM') as HTMLSelectElement).value).toBe('AM');
  });

  it('renders noon as 12 PM', () => {
    const r = render(TimePicker, { props: { value: '12:00', hour12: true } });
    expect(hourOf(r).value).toBe('12');
    expect((r.getByLabelText('AM or PM') as HTMLSelectElement).value).toBe('PM');
  });

  it('carries the 24-hour value in the hidden input while the display is 12-hour', () => {
    const r = render(TimePicker, { props: { value: '13:45', hour12: true, name: 'start' } });

    expect(hourOf(r).value).toBe('01');
    expect((r.getByLabelText('AM or PM') as HTMLSelectElement).value).toBe('PM');

    const hidden = hiddenOf(r);
    expect(hidden.value).toBe('13:45');
    expect(hidden.name).toBe('start');
  });

  it('cycles the hour inside its own meridiem rather than flipping it', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '11:00', hour12: true, onchange } });

    await fireEvent.keyDown(hourOf(r), { key: 'ArrowUp' });

    expect(hourOf(r).value).toBe('12');
    expect((r.getByLabelText('AM or PM') as HTMLSelectElement).value).toBe('AM');
    expect(onchange).toHaveBeenLastCalledWith('00:00');
  });
});

describe('TimePicker stepping', () => {
  it('wraps the minute past 59 without changing the hour', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '09:59', onchange } });

    await fireEvent.keyDown(minuteOf(r), { key: 'ArrowUp' });

    expect(hourOf(r).value).toBe('09');
    expect(minuteOf(r).value).toBe('00');
    expect(onchange).toHaveBeenLastCalledWith('09:00');
  });

  it('lands a step of 15 on 0, 15, 30 and 45', async () => {
    const r = render(TimePicker, { props: { value: '09:00', step: 15 } });
    const landed: string[] = [];

    for (let i = 0; i < 4; i++) {
      await fireEvent.keyDown(minuteOf(r), { key: 'ArrowUp' });
      landed.push(minuteOf(r).value);
    }

    expect(landed).toEqual(['15', '30', '45', '00']);
  });

  it('moves the hour by one even when the step is coarse', async () => {
    const r = render(TimePicker, { props: { value: '09:00', step: 15 } });
    await fireEvent.keyDown(hourOf(r), { key: 'ArrowUp' });
    expect(hourOf(r).value).toBe('10');
  });

  it('moves by ten on PageUp and PageDown', async () => {
    const r = render(TimePicker, { props: { value: '09:20' } });

    await fireEvent.keyDown(minuteOf(r), { key: 'PageUp' });
    expect(minuteOf(r).value).toBe('30');

    await fireEvent.keyDown(minuteOf(r), { key: 'PageDown' });
    expect(minuteOf(r).value).toBe('20');
  });

  it('sends Home and End to that segment and no other', async () => {
    const r = render(TimePicker, { props: { value: '09:30' } });

    await fireEvent.keyDown(minuteOf(r), { key: 'End' });
    expect(minuteOf(r).value).toBe('59');
    expect(hourOf(r).value).toBe('09');

    await fireEvent.keyDown(hourOf(r), { key: 'Home' });
    expect(hourOf(r).value).toBe('00');
    expect(minuteOf(r).value).toBe('59');
  });

  it('takes the 12-hour hour to 1 on Home and 12 on End', async () => {
    const r = render(TimePicker, { props: { value: '09:30', hour12: true } });

    await fireEvent.keyDown(hourOf(r), { key: 'Home' });
    expect(hourOf(r).value).toBe('01');

    await fireEvent.keyDown(hourOf(r), { key: 'End' });
    expect(hourOf(r).value).toBe('12');
  });
});

describe('TimePicker bounds', () => {
  it('clamps the whole time to min and not each segment', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, {
      props: { value: '10:15', min: '09:30', max: '17:00', onchange },
    });

    // Per-segment clamping would have pushed this minute to 30 on render.
    expect(minuteOf(r).value).toBe('15');

    await fireEvent.keyDown(hourOf(r), { key: 'ArrowDown' });

    expect(hourOf(r).value).toBe('09');
    expect(minuteOf(r).value).toBe('30');
    expect(onchange).toHaveBeenLastCalledWith('09:30');
  });

  it('clamps the whole time to max', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, {
      props: { value: '16:45', min: '09:30', max: '17:00', onchange },
    });

    await fireEvent.keyDown(hourOf(r), { key: 'ArrowUp' });

    expect(hourOf(r).value).toBe('17');
    expect(minuteOf(r).value).toBe('00');
    expect(onchange).toHaveBeenLastCalledWith('17:00');
  });

  it('accepts a time after midnight when min is greater than max', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, {
      props: { value: '02:00', min: '22:00', max: '06:00', onchange },
    });

    await fireEvent.keyDown(minuteOf(r), { key: 'ArrowUp' });

    expect(hourOf(r).value).toBe('02');
    expect(minuteOf(r).value).toBe('01');
    expect(onchange).toHaveBeenLastCalledWith('02:01');
  });

  it('accepts a time before midnight in the same overnight window', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, {
      props: { value: '23:30', min: '22:00', max: '06:00', onchange },
    });

    await fireEvent.keyDown(minuteOf(r), { key: 'ArrowUp' });

    expect(hourOf(r).value).toBe('23');
    expect(minuteOf(r).value).toBe('31');
    expect(onchange).toHaveBeenLastCalledWith('23:31');
  });

  it('rejects a time inside the excluded gap of an overnight window', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, {
      props: { value: '12:00', min: '22:00', max: '06:00', onchange },
    });

    await fireEvent.keyDown(minuteOf(r), { key: 'ArrowUp' });

    expect(onchange).toHaveBeenLastCalledWith('06:00');
  });
});

describe('TimePicker typing', () => {
  it('advances focus after two digits', async () => {
    const r = render(TimePicker, { props: { value: '' } });
    hourOf(r).focus();

    // One digit is not a value yet, so the caret stays where the user put it.
    await fireEvent.keyDown(hourOf(r), { key: '1' });
    expect(hourOf(r).value).toBe('1');
    expect(document.activeElement).toBe(hourOf(r));

    await fireEvent.keyDown(hourOf(r), { key: '2' });
    expect(hourOf(r).value).toBe('12');
    expect(document.activeElement).toBe(minuteOf(r));
  });

  it('advances immediately on a digit that cannot start a legal value', async () => {
    const r = render(TimePicker, { props: { value: '' } });

    await fireEvent.keyDown(hourOf(r), { key: '5' });

    expect(hourOf(r).value).toBe('05');
    expect(document.activeElement).toBe(minuteOf(r));
  });

  it('advances immediately on a minute digit above five', async () => {
    const r = render(TimePicker, { props: { value: '', seconds: true } });

    await fireEvent.keyDown(minuteOf(r), { key: '7' });

    expect(minuteOf(r).value).toBe('07');
    expect(document.activeElement).toBe(r.getByLabelText('Second'));
  });

  it('restarts the entry when the second digit cannot follow the first', async () => {
    const r = render(TimePicker, { props: { value: '' } });

    await fireEvent.keyDown(hourOf(r), { key: '2' });
    await fireEvent.keyDown(hourOf(r), { key: '5' });

    expect(hourOf(r).value).toBe('05');
    expect(document.activeElement).toBe(minuteOf(r));
  });

  it('clears the segment and moves back on Backspace', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '09:30', onchange } });

    await fireEvent.keyDown(minuteOf(r), { key: 'Backspace' });

    expect(minuteOf(r).value).toBe('');
    expect(hourOf(r).value).toBe('09');
    expect(document.activeElement).toBe(hourOf(r));
    expect(onchange).toHaveBeenLastCalledWith('');
  });

  it('walks the segments with the left and right arrows', async () => {
    const r = render(TimePicker, { props: { value: '09:30:15', seconds: true, hour12: true } });

    await fireEvent.keyDown(hourOf(r), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(minuteOf(r));

    await fireEvent.keyDown(minuteOf(r), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(r.getByLabelText('Second'));

    await fireEvent.keyDown(r.getByLabelText('Second'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(r.getByLabelText('AM or PM'));

    await fireEvent.keyDown(r.getByLabelText('AM or PM'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(r.getByLabelText('Second'));
  });

  it('pads a single typed digit when the segment loses focus', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '09:30', onchange } });

    await fireEvent.keyDown(minuteOf(r), { key: '4' });
    expect(minuteOf(r).value).toBe('4');

    await fireEvent.blur(minuteOf(r));

    expect(minuteOf(r).value).toBe('04');
    expect(onchange).toHaveBeenLastCalledWith('09:04');
  });

  it('puts back what it was showing when text arrives without a keystroke', async () => {
    const r = render(TimePicker, { props: { value: '09:30' } });

    const minute = minuteOf(r);
    minute.value = 'zz';
    await fireEvent.input(minute);

    expect(minute.value).toBe('30');
  });
});

describe('TimePicker accessibility', () => {
  it('gives every segment its own aria-label and spinbutton values', () => {
    const r = render(TimePicker, { props: { value: '09:30:15', seconds: true } });

    const hour = hourOf(r);
    expect(hour.getAttribute('role')).toBe('spinbutton');
    expect(hour.getAttribute('aria-valuenow')).toBe('9');
    expect(hour.getAttribute('aria-valuemin')).toBe('0');
    expect(hour.getAttribute('aria-valuemax')).toBe('23');
    expect(hour.getAttribute('aria-valuetext')).toBe('09');

    const minute = minuteOf(r);
    expect(minute.getAttribute('aria-valuenow')).toBe('30');
    expect(minute.getAttribute('aria-valuemin')).toBe('0');
    expect(minute.getAttribute('aria-valuemax')).toBe('59');

    const second = r.getByLabelText('Second');
    expect(second.getAttribute('role')).toBe('spinbutton');
    expect(second.getAttribute('aria-valuenow')).toBe('15');
    expect(second.getAttribute('aria-valuemax')).toBe('59');
  });

  it('bounds the 12-hour hour at 1 and 12', () => {
    const r = render(TimePicker, { props: { value: '13:45', hour12: true } });
    const hour = hourOf(r);
    expect(hour.getAttribute('aria-valuemin')).toBe('1');
    expect(hour.getAttribute('aria-valuemax')).toBe('12');
    expect(hour.getAttribute('aria-valuenow')).toBe('1');
  });

  it('renders empty segments for an empty value rather than 00:00', () => {
    const r = render(TimePicker, { props: { value: '', seconds: true } });

    expect(hourOf(r).value).toBe('');
    expect(minuteOf(r).value).toBe('');
    expect((r.getByLabelText('Second') as HTMLInputElement).value).toBe('');
    expect(hiddenOf(r).value).toBe('');

    // An empty spinbutton has no number to announce, so it says so in words.
    expect(hourOf(r).getAttribute('aria-valuenow')).toBeNull();
    expect(hourOf(r).getAttribute('aria-valuetext')).toBe('Empty');
  });

  it('names the group from its label and points the label at the hour', () => {
    const r = render(TimePicker, { props: { value: '09:30', label: 'Start', id: 'shift' } });

    const group = r.container.querySelector('[role="group"]') as HTMLElement;
    expect(group.getAttribute('aria-labelledby')).toBe('shift-label');
    expect(r.container.querySelector('#shift-label')?.getAttribute('for')).toBe('shift-hour');
  });

  it('points the group at whichever message is on screen', () => {
    const withHint = render(TimePicker, {
      props: { value: '09:30', id: 'a', hint: 'Local time' },
    });
    expect(
      (withHint.container.querySelector('[role="group"]') as HTMLElement).getAttribute(
        'aria-describedby',
      ),
    ).toBe('a-hint');

    const withError = render(TimePicker, {
      props: { value: '09:30', id: 'b', hint: 'Local time', error: 'Outside opening hours' },
    });
    expect(
      (withError.container.querySelector('[role="group"]') as HTMLElement).getAttribute(
        'aria-describedby',
      ),
    ).toBe('b-error');
  });

  it('shows an error instead of a hint, never both at once', () => {
    const r = render(TimePicker, {
      props: { value: '09:30', hint: 'Local time', error: 'Outside opening hours' },
    });
    expect(r.getByText('Outside opening hours')).toBeTruthy();
    expect(r.queryByText('Local time')).toBeNull();
  });

  it('marks every segment invalid when the field is', () => {
    const r = render(TimePicker, { props: { value: '09:30', error: 'Too early' } });
    expect(hourOf(r).getAttribute('aria-invalid')).toBe('true');
    expect(minuteOf(r).getAttribute('aria-invalid')).toBe('true');
  });

  it('ignores the keyboard when disabled', async () => {
    const onchange = vi.fn();
    const r = render(TimePicker, { props: { value: '09:30', disabled: true, onchange } });

    expect(hourOf(r).disabled).toBe(true);
    await fireEvent.keyDown(hourOf(r), { key: 'ArrowUp' });
    expect(hourOf(r).value).toBe('09');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('gives the segments no name, so only the hidden input is posted', () => {
    const r = render(TimePicker, { props: { value: '09:30:15', seconds: true, name: 'start' } });
    const named = [...r.container.querySelectorAll('input[name], select[name]')];
    expect(named).toHaveLength(1);
    expect((named[0] as HTMLInputElement).type).toBe('hidden');
  });
});

describe('TimePicker required marker', () => {
  it('states the requirement on the segments, not in the group name', () => {
    // The marker carried aria-label="required" inside the label the group names
    // itself from, so the field announced as "At required". Each segment
    // already carried aria-required; only the marker was wrong.
    const { container, getByRole, getByLabelText } = render(TimePicker, {
      props: { label: 'At', required: true },
    });
    expect(getByRole('group', { name: 'At' })).toBeTruthy();
    expect((getByLabelText('Hour') as HTMLElement).getAttribute('aria-required')).toBe('true');
    expect((getByLabelText('Minute') as HTMLElement).getAttribute('aria-required')).toBe('true');
    const marker = container.querySelector('label span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });
});
