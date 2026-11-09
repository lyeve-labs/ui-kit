import { fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync, tick, type Component } from 'svelte';
import { describe, expect, it } from 'vitest';
import AssistOne from '../../../tests/fixtures/AssistOne.svelte';
import SlugField from '../../../tests/fixtures/SlugField.svelte';
import { assistForms, type AssistKind, type AssistValue } from '../internal/assist.svelte.js';
import Autocomplete from './Autocomplete.svelte';
import Checkbox from './Checkbox.svelte';
import CheckboxGroup from './CheckboxGroup.svelte';
import ColorField from './ColorField.svelte';
import DatePicker from './DatePicker.svelte';
import DateTimePicker from './DateTimePicker.svelte';
import FileInput from './FileInput.svelte';
import FilterChips from './FilterChips.svelte';
import Input from './Input.svelte';
import MultiSelect from './MultiSelect.svelte';
import NumberInput from './NumberInput.svelte';
import PasswordInput from './PasswordInput.svelte';
import RadioGroup from './RadioGroup.svelte';
import SegmentedControl from './SegmentedControl.svelte';
import Select from './Select.svelte';
import Textarea from './Textarea.svelte';
import TimePicker from './TimePicker.svelte';
import Toggle from './Toggle.svelte';

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

interface Case {
  control: Component<any>;
  props: Record<string, unknown>;
  kind: AssistKind;
  /** A value the control can hold, and what the form then posts. */
  good: AssistValue;
  posts: string[];
  /** Values the control cannot hold, each skipped as invalid. */
  bad: unknown[];
}

const CASES: Record<string, Case> = {
  Input: {
    control: Input,
    props: {},
    kind: 'text',
    good: 'website-read',
    posts: ['website-read'],
    bad: [3],
  },
  Textarea: {
    control: Textarea,
    props: {},
    kind: 'multiline',
    good: 'Two\nlines',
    posts: ['Two\nlines'],
    bad: [true],
  },
  NumberInput: {
    control: NumberInput,
    props: { value: 1, min: 0, max: 10 },
    kind: 'number',
    good: 7,
    posts: ['7'],
    bad: ['7', 11, Number.NaN],
  },
  Select: {
    control: Select,
    props: { options: roles },
    kind: 'choice',
    good: 'viewer',
    posts: ['viewer'],
    bad: ['owner', 2],
  },
  MultiSelect: {
    control: MultiSelect,
    props: { options: roles },
    kind: 'choices',
    good: ['admin', 'viewer'],
    posts: ['admin', 'viewer'],
    bad: ['admin', ['admin', 'owner'], ['admin', 'admin']],
  },
  Autocomplete: {
    control: Autocomplete,
    props: { options: roles },
    kind: 'choice',
    good: 'editor',
    posts: ['editor'],
    bad: ['Editor'],
  },
  Checkbox: {
    control: Checkbox,
    props: {},
    kind: 'boolean',
    good: true,
    posts: ['on'],
    bad: ['true', 1],
  },
  CheckboxGroup: {
    control: CheckboxGroup,
    props: { options: roles },
    kind: 'choices',
    good: ['editor'],
    posts: ['editor'],
    bad: [['owner'], 'editor'],
  },
  Toggle: { control: Toggle, props: {}, kind: 'boolean', good: true, posts: ['on'], bad: ['on'] },
  RadioGroup: {
    control: RadioGroup,
    props: { options: roles, value: 'admin' },
    kind: 'choice',
    good: 'viewer',
    posts: ['viewer'],
    bad: ['owner'],
  },
  SegmentedControl: {
    control: SegmentedControl,
    props: { options: roles, value: 'admin' },
    kind: 'choice',
    good: 'editor',
    posts: ['editor'],
    bad: ['owner'],
  },
  FilterChips: {
    control: FilterChips,
    props: { options: roles, value: 'admin' },
    kind: 'choice',
    good: 'viewer',
    posts: ['viewer'],
    bad: ['owner'],
  },
  DatePicker: {
    control: DatePicker,
    props: { min: '2026-01-01' },
    kind: 'date',
    good: '2027-11-09',
    posts: ['2027-11-09'],
    bad: ['2027-02-30', '11/09/2027', '2025-12-31', 20271109],
  },
  DateTimePicker: {
    control: DateTimePicker,
    props: {},
    kind: 'datetime',
    good: '2027-11-09T10:30',
    posts: ['2027-11-09T10:30'],
    bad: ['2027-11-09 10:30', '2027-11-09T25:00', '2027-11-09T10:30:15'],
  },
  TimePicker: {
    control: TimePicker,
    props: {},
    kind: 'time',
    good: '09:45',
    posts: ['09:45'],
    bad: ['9:45', '09:45:10', '24:00'],
  },
  ColorField: {
    control: ColorField,
    props: {},
    kind: 'color',
    good: '#336699',
    posts: ['#336699'],
    bad: ['#369', 'blue', '#33669g'],
  },
};

async function settle() {
  flushSync();
  await tick();
  flushSync();
}

const controller = () => assistForms().find((f) => f.label === 'One')!.controller;
const posted = (name: string) =>
  new FormData(document.querySelector('form')!).getAll(name).map((v) => String(v));

describe('each control inside a FormAssist', () => {
  it.each(Object.entries(CASES))('%s registers once, by name', (_, c) => {
    render(AssistOne, {
      props: { control: c.control, props: { ...c.props, name: 'field', label: 'Field' } },
    });
    const fields = controller().describe();
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      withheld: false,
      name: 'field',
      label: 'Field',
      kind: c.kind,
    });
  });

  it.each(Object.entries(CASES))(
    '%s takes a value it can hold, and the form posts it',
    async (_, c) => {
      render(AssistOne, {
        props: { control: c.control, props: { ...c.props, name: 'field', label: 'Field' } },
      });
      expect(controller().suggest({ field: c.good })).toEqual({ applied: ['field'], skipped: [] });
      await settle();
      expect(posted('field')).toEqual(c.posts);
      expect(screen.getByRole('button', { name: 'Accept the suggestion for Field' })).toBeTruthy();
      await fireEvent.click(
        screen.getByRole('button', { name: 'Reject the suggestion for Field' }),
      );
      await settle();
      expect(controller().pending()).toEqual([]);
      expect(posted('field')).not.toEqual(c.posts);
    },
  );

  it.each(Object.entries(CASES))('%s skips a value it cannot hold', (_, c) => {
    render(AssistOne, {
      props: { control: c.control, props: { ...c.props, name: 'field', label: 'Field' } },
    });
    for (const value of c.bad) {
      expect(controller().suggest({ field: value as AssistValue }).skipped, String(value)).toEqual([
        { name: 'field', reason: 'invalid' },
      ]);
    }
  });

  it.each(Object.entries(CASES))(
    '%s withheld by noAI is described by label and kind alone',
    (_, c) => {
      const { container } = render(AssistOne, {
        props: {
          control: c.control,
          props: { ...c.props, name: 'field', label: 'Field', noAI: true },
        },
      });
      expect(controller().describe()).toEqual([{ withheld: true, label: 'Field', kind: c.kind }]);
      expect(controller().suggest({ field: c.good }).skipped).toEqual([
        { name: 'field', reason: 'withheld' },
      ]);
      expect(container.querySelector('[data-no-ai]')).not.toBeNull();
    },
  );

  it('withholds a password, a password Input and a file by their kind', () => {
    for (const [control, props, kind] of [
      [PasswordInput, {}, 'secret'],
      [Input, { type: 'password' }, 'secret'],
      [FileInput, {}, 'file'],
    ] as const) {
      const { unmount, container } = render(AssistOne, {
        props: { control, props: { ...props, name: 'field', label: 'Field' } },
      });
      expect(controller().describe()).toEqual([{ withheld: true, label: 'Field', kind }]);
      expect(controller().suggest({ field: 'x' }).skipped).toEqual([
        { name: 'field', reason: 'withheld' },
      ]);
      expect(container.querySelector('[data-no-ai]')).toBeNull();
      unmount();
    }
  });

  it('registers nothing for a control with no name', () => {
    render(AssistOne, { props: { control: Input, props: { label: 'Field' } } });
    expect(controller().describe()).toEqual([]);
  });

  it('registers a control the kit does not ship through the same function', async () => {
    render(AssistOne, { props: { control: SlugField, props: { name: 'slug', label: 'Slug' } } });
    expect(controller().describe()).toEqual([
      {
        withheld: false,
        name: 'slug',
        label: 'Slug',
        kind: 'text',
        required: false,
        value: '',
        edited: false,
      },
    ]);
    expect(controller().suggest({ slug: 'Not A Slug' }).skipped).toEqual([
      { name: 'slug', reason: 'invalid' },
    ]);
    expect(controller().suggest({ slug: 'flu-shots' }).applied).toEqual(['slug']);
    await settle();
    expect(posted('slug')).toEqual(['flu-shots']);
    await fireEvent.click(screen.getByRole('button', { name: 'Keep the slug' }));
    expect(controller().pending()).toEqual([]);
    expect(posted('slug')).toEqual(['flu-shots']);
  });
});
