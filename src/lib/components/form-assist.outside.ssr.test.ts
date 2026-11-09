// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { describe, expect, it } from 'vitest';
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

/**
 * Every control that can register with a FormAssist, rendered outside one.
 * The fixtures were taken from the controls before FormAssist existed, so a
 * control a page has not opted in draws exactly what it drew then. Comments
 * are dropped because Svelte's block anchors are not markup a reader or a
 * browser agent sees, and the generated ids are replaced by their place.
 */
const DIR = resolve('tests/fixtures/outside-assist');

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const CASES: [string, Component<any>, Record<string, unknown>][] = [
  ['Input', Input, { name: 'title', label: 'Title', hint: 'Shown on the page.', value: 'Hello' }],
  ['Textarea', Textarea, { name: 'body', label: 'Body', hint: 'Plain text.', value: 'Text' }],
  ['NumberInput', NumberInput, { name: 'limit', label: 'Limit', value: 3, min: 0, max: 9 }],
  ['Select', Select, { name: 'role', label: 'Role', options: roles, value: 'editor' }],
  ['MultiSelect', MultiSelect, { label: 'Roles', options: roles, value: ['admin'] }],
  ['Autocomplete', Autocomplete, { name: 'owner', label: 'Owner', options: roles, value: 'admin' }],
  ['Checkbox', Checkbox, { name: 'agree', label: 'Agree', checked: true }],
  [
    'CheckboxGroup',
    CheckboxGroup,
    { name: 'roles', label: 'Roles', options: roles, value: ['viewer'] },
  ],
  ['Toggle', Toggle, { label: 'Active', checked: true }],
  ['RadioGroup', RadioGroup, { name: 'plan', label: 'Plan', options: roles, value: 'admin' }],
  [
    'SegmentedControl',
    SegmentedControl,
    { name: 'view', label: 'View', options: roles, value: 'admin' },
  ],
  ['FilterChips', FilterChips, { label: 'Status', options: roles, value: 'admin' }],
  ['DatePicker', DatePicker, { label: 'Starts', value: '2027-11-09' }],
  ['DateTimePicker', DateTimePicker, { name: 'at', label: 'At', value: '2027-11-09T10:30' }],
  ['TimePicker', TimePicker, { name: 'time', label: 'Time', value: '10:30' }],
  ['ColorField', ColorField, { name: 'color', label: 'Color', value: '#336699' }],
  ['PasswordInput', PasswordInput, { name: 'secret', label: 'Secret', value: 'hunter2' }],
  ['FileInput', FileInput, { name: 'file', label: 'File' }],
];

function plain(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(["\s#])c\d+(?=["-])/g, '$1cN')
    .trim();
}

describe('a control outside a FormAssist, rendered on the server', () => {
  it.each(CASES)('%s renders the markup it rendered before FormAssist', (name, C, props) => {
    const { body } = render(C, { props });
    const file = join(DIR, `${name}.ssr.html`);
    expect(plain(body)).toBe(readFileSync(file, 'utf8').trim());
  });
});
