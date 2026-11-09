import { fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync, tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import AssistForm from '../../../tests/fixtures/AssistForm.svelte';
import AssistInField from '../../../tests/fixtures/AssistInField.svelte';
import AssistOne from '../../../tests/fixtures/AssistOne.svelte';
import AssistSection from '../../../tests/fixtures/AssistSection.svelte';
import { assistForms, type AssistFieldDescription } from '../internal/assist.svelte.js';
import Checkbox from './Checkbox.svelte';
import CheckboxGroup from './CheckboxGroup.svelte';
import Input from './Input.svelte';
import RadioGroup from './RadioGroup.svelte';
import Toggle from './Toggle.svelte';

const form = (label: string) => assistForms().find((f) => f.label === label)!;
const named = (fields: AssistFieldDescription[], name: string) =>
  fields.find((f) => !f.withheld && f.name === name);

async function settle() {
  flushSync();
  await tick();
  flushSync();
  await tick();
  flushSync();
}

function submit(el: HTMLFormElement): Event {
  const event = new Event('submit', { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

describe('a pending field that leaves the page', () => {
  it('puts its old value back, lifts the hold, and returns unreviewed', async () => {
    const { rerender } = render(AssistSection);
    expect(form('Section').suggest({ title: 'New' }).applied).toEqual(['title']);
    await settle();
    expect(screen.getByTestId('title').textContent).toBe('New');

    await rerender({ show: false });
    await settle();
    expect(screen.getByTestId('title').textContent).toBe('Old');
    expect(form('Section').pending()).toEqual([]);
    expect(submit(screen.getByTestId('outer') as HTMLFormElement).defaultPrevented).toBe(false);

    await rerender({ show: true });
    await settle();
    expect((document.querySelector('input[name="title"]') as HTMLInputElement).value).toBe('Old');
    expect(form('Section').describe()).toMatchObject([
      { name: 'title', value: 'Old', edited: false },
    ]);
  });
});

describe('the submit hold', () => {
  it('leaves a form nested inside the FormAssist alone', async () => {
    for (const outer of [true, false]) {
      const { unmount } = render(AssistSection, { props: { outer } });
      form('Section').suggest({ title: 'New' });
      await settle();
      const search = screen.getByTestId('search') as HTMLFormElement;
      expect(submit(search).defaultPrevented, `outer form: ${outer}`).toBe(false);
      if (outer)
        expect(submit(screen.getByTestId('outer') as HTMLFormElement).defaultPrevented).toBe(true);
      unmount();
    }
  });
});

describe('a form reset', () => {
  it('forgets the edits, so the next suggestion goes in', async () => {
    const { container } = render(AssistForm);
    const c = form('New key');
    const name = document.querySelector('input[name="name"]') as HTMLInputElement;
    await fireEvent.input(name, { target: { value: 'my-key' } });
    await settle();
    expect(c.suggest({ name: 'x' }).skipped).toEqual([{ name: 'name', reason: 'edited' }]);

    container.querySelector('form')!.reset();
    await settle();
    expect(named(c.describe(), 'name')).toMatchObject({ edited: false });
    expect(c.suggest({ name: 'website-read' }).applied).toEqual(['name']);
    await settle();
    expect(name.value).toBe('website-read');

    // The person's next change is theirs again.
    await fireEvent.input(name, { target: { value: 'mine' } });
    await settle();
    expect(named(c.describe(), 'name')).toMatchObject({ edited: true });
  });
});

describe('a password Input whose type changes', () => {
  it('stays withheld after it shows its value as text', async () => {
    const { rerender } = render(AssistOne, {
      props: { control: Input, props: { name: 'pin', label: 'PIN', type: 'password' } },
    });
    expect(form('One').describe()).toEqual([{ withheld: true, label: 'PIN', kind: 'secret' }]);
    await rerender({ control: Input, props: { name: 'pin', label: 'PIN', type: 'text' } });
    await settle();
    expect(form('One').describe()).toMatchObject([{ withheld: true, label: 'PIN' }]);
    expect(form('One').suggest({ pin: '1234' }).skipped).toEqual([
      { name: 'pin', reason: 'unknown' },
    ]);
  });
});

describe('Toggle and Checkbox while a suggestion comes and goes', () => {
  it.each([
    ['Toggle', Toggle, 'switch'],
    ['Checkbox', Checkbox, 'checkbox'],
  ] as const)(
    '%s keeps its control and its focus, and takes focus back after a decision',
    async (_, control, role) => {
      render(AssistOne, { props: { control, props: { name: 'on', label: 'On' } } });
      const before = screen.getByRole(role, { name: 'On' });
      before.focus();
      form('One').suggest({ on: true });
      await settle();
      expect(screen.getByRole(role, { name: 'On' })).toBe(before);
      expect(document.activeElement).toBe(before);

      const reject = screen.getByRole('button', { name: 'Reject the suggestion for On' });
      expect(before.closest('label')?.contains(reject)).toBe(false);
      reject.focus();
      await fireEvent.click(reject);
      await settle();
      expect(screen.getByRole(role, { name: 'On' })).toBe(before);
      expect(document.activeElement).toBe(before);
    },
  );
});

describe('a group whose legend is hidden', () => {
  it.each([
    ['RadioGroup', RadioGroup, 'admin'],
    ['CheckboxGroup', CheckboxGroup, ['admin']],
  ] as const)('%s draws its buttons outside the hidden legend', async (_, control, good) => {
    render(AssistOne, {
      props: {
        control,
        props: { name: 'role', label: 'Role', labelHidden: true, options: roles },
      },
    });
    form('One').suggest({ role: good as never });
    await settle();
    const accept = screen.getByRole('button', { name: 'Accept the suggestion for Role' });
    expect(accept.closest('legend')).toBeNull();
    expect(accept.closest('.sr-only')).toBeNull();
    expect(accept.closest('fieldset')).not.toBeNull();
  });
});

describe('a control with no label of its own', () => {
  it('names its buttons from a wrapping Field, its aria-label, or else its name', async () => {
    render(AssistInField);
    expect(form('Unlabeled').suggest({ title: 'a', query: 'b', slug: 'c' }).applied).toHaveLength(
      3,
    );
    await settle();
    for (const name of ['Title', 'Search', 'slug']) {
      expect(
        screen.getByRole('button', { name: `Accept the suggestion for ${name}` }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: `Reject the suggestion for ${name}` }),
      ).toBeTruthy();
    }
    await fireEvent.click(screen.getByRole('button', { name: 'Reject the suggestion for slug' }));
    await settle();
    expect(document.activeElement).toBe(document.querySelector('input[name="slug"]'));
  });
});
