import { fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AssistForm from '../../../tests/fixtures/AssistForm.svelte';
import { activeAssistForm, assistForms } from '../internal/assist.svelte.js';
import type { FormAssistController } from '../internal/assist.svelte.js';

function controller(): FormAssistController {
  const form = assistForms().find((f) => f.label === 'New key');
  expect(form, 'the form registered').toBeDefined();
  return form!.controller;
}

const input = (name: string) =>
  document.querySelector(`input[name="${name}"]:not([type="hidden"])`) as HTMLInputElement;
const radio = (label: string) => screen.getByRole('radio', { name: label }) as HTMLInputElement;

async function settle() {
  flushSync();
  await tick();
  flushSync();
}

function submit(form: HTMLFormElement): Event {
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  return event;
}

afterEach(() => vi.restoreAllMocks());

describe('FormAssist', () => {
  it('lists the form for the page once mounted, and drops it when it goes', () => {
    const { unmount } = render(AssistForm);
    expect(assistForms().map((f) => f.label)).toEqual(['New key']);
    expect(activeAssistForm()?.label).toBe('New key');
    unmount();
    expect(assistForms()).toEqual([]);
  });

  it('describes every registered field, withholding the secrets', () => {
    render(AssistForm);
    const fields = controller().describe();
    expect(fields).toEqual([
      {
        withheld: false,
        name: 'name',
        label: 'Name',
        hint: 'Letters and dashes.',
        kind: 'text',
        required: true,
        value: '',
        edited: false,
      },
      {
        withheld: false,
        name: 'role',
        label: 'Role',
        kind: 'choice',
        required: false,
        options: [
          { value: 'editor', label: 'Editor', disabled: undefined },
          { value: 'viewer', label: 'Viewer', disabled: undefined },
        ],
        value: null,
        edited: false,
      },
      {
        withheld: false,
        name: 'active',
        label: 'Active',
        kind: 'boolean',
        required: false,
        value: false,
        edited: false,
      },
      {
        withheld: false,
        name: 'plan',
        label: 'Plan',
        kind: 'choice',
        required: false,
        options: [
          { value: 'free', label: 'Free', disabled: undefined },
          { value: 'pro', label: 'Pro', disabled: undefined },
        ],
        value: 'free',
        edited: false,
      },
      {
        withheld: false,
        name: 'limit',
        label: 'Limit',
        kind: 'number',
        required: false,
        value: 10,
        edited: false,
      },
      { withheld: true, label: 'Secret', kind: 'secret' },
      { withheld: true, label: 'Note', kind: 'text' },
    ]);
    expect(JSON.stringify(fields)).not.toContain('s3cret');
    expect(JSON.stringify(fields)).not.toContain('private');
  });

  it('marks a control withheld by noAI for a browser agent', () => {
    const { container } = render(AssistForm);
    const marked = [...container.querySelectorAll('[data-no-ai]')];
    expect(marked).toHaveLength(1);
    expect(marked[0].contains(input('note'))).toBe(true);
  });

  it('puts each suggestion into its control and reports what it skipped', async () => {
    render(AssistForm);
    const result = controller().suggest({
      name: 'website-read',
      role: 'viewer',
      active: true,
      plan: 'pro',
      limit: 25,
      secret: 'guess',
      note: 'x',
      missing: 'y',
    });
    await settle();
    expect(result).toEqual({
      applied: ['name', 'role', 'active', 'plan', 'limit'],
      skipped: [
        { name: 'secret', reason: 'withheld' },
        { name: 'note', reason: 'withheld' },
        { name: 'missing', reason: 'unknown' },
      ],
    });
    expect(input('name').value).toBe('website-read');
    expect(screen.getByRole('combobox', { name: 'Role' }).textContent).toContain('Viewer');
    expect(input('active').checked).toBe(true);
    expect(radio('Pro').checked).toBe(true);
    expect(input('limit').value).toBe('25');
    expect(input('secret').value).toBe('s3cret');
    expect(input('note').value).toBe('private');
    expect(controller().pending()).toEqual([
      { name: 'name', label: 'Name', value: 'website-read' },
      { name: 'role', label: 'Role', value: 'viewer' },
      { name: 'active', label: 'Active', value: true },
      { name: 'plan', label: 'Plan', value: 'pro' },
      { name: 'limit', label: 'Limit', value: 25 },
    ]);
  });

  it('skips a value the control cannot hold, rather than coercing it', async () => {
    render(AssistForm);
    const result = controller().suggest({
      role: 'owner',
      limit: '25',
      active: 'yes',
      plan: 'enterprise',
      name: 42,
    });
    await settle();
    expect(result.applied).toEqual([]);
    expect(result.skipped).toEqual([
      { name: 'role', reason: 'invalid' },
      { name: 'limit', reason: 'invalid' },
      { name: 'active', reason: 'invalid' },
      { name: 'plan', reason: 'invalid' },
      { name: 'name', reason: 'invalid' },
    ]);
    expect(controller().suggest({ limit: 500 }).skipped).toEqual([
      { name: 'limit', reason: 'invalid' },
    ]);
    expect(controller().pending()).toEqual([]);
    expect(input('limit').value).toBe('10');
  });

  it('draws the suggested state with the tag and named buttons, and announces it once', async () => {
    const { container } = render(AssistForm);
    controller().suggest({ name: 'website-read', role: 'viewer' });
    await settle();
    expect(
      screen.getByText('The assistant suggests 2 values. Accept, reject or change each one.'),
    ).toBeTruthy();
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'The assistant suggests 2 values.',
    );
    expect(screen.getAllByText('Suggested')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Accept the suggestion for Name' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject the suggestion for Role' })).toBeTruthy();
    expect(input('name').className).toContain('border-violet');
    expect(input('name').className).not.toContain('focus:border-brand');
    // The tag stays out of the name a voice-control user speaks.
    expect(screen.getByRole('textbox', { name: 'Name' })).toBe(input('name'));
  });

  it('keeps an accepted value and restores the old one on reject', async () => {
    render(AssistForm);
    controller().suggest({ name: 'website-read', plan: 'pro' });
    await settle();
    await fireEvent.click(screen.getByRole('button', { name: 'Accept the suggestion for Name' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reject the suggestion for Plan' }));
    await settle();
    expect(input('name').value).toBe('website-read');
    expect(radio('Free').checked).toBe(true);
    expect(controller().pending()).toEqual([]);
    expect(screen.queryByText('Suggested')).toBeNull();
    expect(input('name').className).not.toContain('border-violet');
    expect(document.activeElement).toBe(radio('Free'));
  });

  it('names a group by its legend alone while the legend holds the buttons', async () => {
    render(AssistForm);
    controller().suggest({ plan: 'pro' });
    await settle();
    expect(screen.getByRole('radiogroup', { name: 'Plan' })).toBeTruthy();
  });

  it('accepts and rejects every suggestion from the bar', async () => {
    render(AssistForm);
    controller().suggest({ name: 'a', limit: 30 });
    await settle();
    await fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await settle();
    expect(input('name').value).toBe('');
    expect(input('limit').value).toBe('10');
    controller().suggest({ name: 'b', limit: 40 });
    await settle();
    await fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    await settle();
    expect(input('name').value).toBe('b');
    expect(input('limit').value).toBe('40');
    expect(screen.queryByText(/The assistant suggests/)).toBeNull();
  });

  it('accepts and rejects through the controller by name', async () => {
    render(AssistForm);
    const c = controller();
    c.suggest({ name: 'a', active: true });
    await settle();
    expect(c.accept('name')).toBe(true);
    expect(c.accept('name')).toBe(false);
    expect(c.reject('active')).toBe(true);
    expect(c.reject('nothing')).toBe(false);
    await settle();
    expect(input('active').checked).toBe(false);
    expect(input('name').value).toBe('a');
  });

  it('makes a changed value the person own, and never overwrites a field they edited', async () => {
    render(AssistForm);
    const c = controller();
    c.suggest({ name: 'website-read' });
    await settle();
    await fireEvent.input(input('name'), { target: { value: 'my-key' } });
    await settle();
    expect(c.pending()).toEqual([]);
    expect(input('name').value).toBe('my-key');
    expect(c.describe().find((f) => !f.withheld && f.name === 'name')).toMatchObject({
      edited: true,
      value: 'my-key',
    });

    await fireEvent.input(input('limit'), { target: { value: '12' } });
    await settle();
    expect(c.suggest({ name: 'other', limit: 50 }).skipped).toEqual([
      { name: 'name', reason: 'edited' },
      { name: 'limit', reason: 'edited' },
    ]);
    expect(input('name').value).toBe('my-key');
  });

  it('holds the submit while a suggestion is pending, before any other submit handler', async () => {
    const onsubmit = vi.fn();
    const { container } = render(AssistForm, { props: { onsubmit } });
    const form = container.querySelector('form')!;
    controller().suggest({ name: 'website-read', limit: 20 });
    await settle();

    expect(submit(form).defaultPrevented).toBe(true);
    await settle();
    expect(onsubmit).not.toHaveBeenCalled();
    const bar = screen
      .getByText('Accept or reject the 2 suggested values before you save.')
      .closest('[tabindex="-1"]');
    expect(document.activeElement).toBe(bar);

    controller().acceptAll();
    await settle();
    submit(form);
    expect(onsubmit).toHaveBeenCalledTimes(1);
  });

  it('lets a form with nothing pending submit untouched', () => {
    const onsubmit = vi.fn();
    const { container } = render(AssistForm, { props: { onsubmit } });
    expect(submit(container.querySelector('form')!).defaultPrevented).toBe(false);
    expect(onsubmit).toHaveBeenCalledTimes(1);
  });
});
