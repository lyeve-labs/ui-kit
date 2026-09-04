import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PasswordInput from './PasswordInput.svelte';

function input(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input') as HTMLInputElement;
}

function toggle(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector('button');
}

describe('PasswordInput', () => {
  it('starts masked and flips the input type both ways', async () => {
    const { container } = render(PasswordInput, { props: { label: 'API key' } });
    expect(input(container).getAttribute('type')).toBe('password');

    await fireEvent.click(toggle(container) as HTMLButtonElement);
    expect(input(container).getAttribute('type')).toBe('text');

    await fireEvent.click(toggle(container) as HTMLButtonElement);
    expect(input(container).getAttribute('type')).toBe('password');
  });

  it('carries type="button", so it never submits the form it sits in', async () => {
    // A button inside a form defaults to type="submit". A reveal control that
    // posts a login form on the first click is the defect this closes, and
    // jsdom fires a submit event for a submit button, so the spy bites.
    const form = document.createElement('form');
    document.body.appendChild(form);
    const submitted = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', submitted);

    const { container } = render(PasswordInput, { target: form, props: { label: 'Secret' } });
    const button = toggle(container) as HTMLButtonElement;
    expect(button.getAttribute('type')).toBe('button');

    await fireEvent.click(button);
    expect(submitted).not.toHaveBeenCalled();
    expect(input(container).getAttribute('type')).toBe('text');
  });

  it('states the action and the target in its accessible name, and changes it with the state', async () => {
    const { container, getByLabelText, queryByLabelText } = render(PasswordInput, {
      props: { label: 'Client secret' },
    });
    expect(getByLabelText('Show password')).toBeTruthy();
    expect(queryByLabelText('Hide password')).toBeNull();

    await fireEvent.click(toggle(container) as HTMLButtonElement);
    expect(getByLabelText('Hide password')).toBeTruthy();
    expect(queryByLabelText('Show password')).toBeNull();
  });

  it('tracks the revealed state with aria-pressed', async () => {
    const { container } = render(PasswordInput, { props: { label: 'DSN' } });
    const button = toggle(container) as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('points aria-controls at the input it reveals', () => {
    const { container } = render(PasswordInput, { props: { label: 'Token' } });
    const button = toggle(container) as HTMLButtonElement;
    expect(button.getAttribute('aria-controls')).toBe(input(container).id);
    expect(input(container).id).not.toBe('');
  });

  it('renders no button when revealable is false', () => {
    const { container } = render(PasswordInput, {
      props: { label: 'Recovery code', revealable: false },
    });
    expect(toggle(container)).toBeNull();
    expect(input(container).getAttribute('type')).toBe('password');
  });

  it('renders no button when disabled', () => {
    const { container } = render(PasswordInput, { props: { label: 'Key', disabled: true } });
    expect(toggle(container)).toBeNull();
    expect(input(container).disabled).toBe(true);
  });

  it('associates the label with the input by for and id', () => {
    const { container } = render(PasswordInput, { props: { label: 'Database password' } });
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe(input(container).id);
    expect(label.className).not.toContain('sr-only');
  });

  it('keeps a real label with for and id when labelHidden', () => {
    // A row of secrets names each field in a table cell, so the visible label
    // is a duplicate. Dropping the element entirely would leave the control
    // announced as just "password".
    const { container } = render(PasswordInput, {
      props: { label: 'Row secret', labelHidden: true },
    });
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.textContent?.trim()).toBe('Row secret');
    expect(label.getAttribute('for')).toBe(input(container).id);
    expect(label.className).toContain('sr-only');
  });

  it('points aria-describedby at the hint, and then at the error', () => {
    const hinted = render(PasswordInput, { props: { label: 'Key', hint: 'Paste it once' } });
    const hintId = input(hinted.container).getAttribute('aria-describedby');
    expect(hintId).toBe(`${input(hinted.container).id}-hint`);
    expect(hinted.container.querySelector(`#${hintId}`)?.textContent).toBe('Paste it once');
    expect(input(hinted.container).getAttribute('aria-invalid')).toBeNull();
    hinted.unmount();

    const failed = render(PasswordInput, {
      props: { label: 'Key', hint: 'Paste it once', error: 'That key is not valid' },
    });
    const errorId = input(failed.container).getAttribute('aria-describedby');
    expect(errorId).toBe(`${input(failed.container).id}-error`);
    expect(failed.container.querySelector(`#${errorId}`)?.textContent).toBe(
      'That key is not valid',
    );
    expect(input(failed.container).getAttribute('aria-invalid')).toBe('true');
    expect(failed.queryByText('Paste it once')).toBeNull();
    expect(input(failed.container).className).toContain('border-danger');
  });

  it('sends controlClass to the input and class to the wrapper', () => {
    // Input's own class prop lands on the field wrapper, so a class meant for
    // the control was swallowed with no error. The two targets are named apart.
    const { container } = render(PasswordInput, {
      props: { label: 'Key', class: 'col-span-2', controlClass: 'font-mono' },
    });
    expect((container.firstElementChild as HTMLElement).className).toContain('col-span-2');
    expect((container.firstElementChild as HTMLElement).className).not.toContain('font-mono');
    expect(input(container).className).toContain('font-mono');
    expect(input(container).className).not.toContain('col-span-2');
  });

  it('resets to hidden when the value is cleared', async () => {
    const { container, rerender } = render(PasswordInput, {
      props: { label: 'Key', value: 'hunter2' },
    });
    await fireEvent.click(toggle(container) as HTMLButtonElement);
    expect(input(container).getAttribute('type')).toBe('text');

    await rerender({ value: '' });
    expect(input(container).getAttribute('type')).toBe('password');
    expect((toggle(container) as HTMLButtonElement).getAttribute('aria-pressed')).toBe('false');
  });

  it('defaults autocomplete to new-password and accepts the other two', () => {
    // A browser offering a saved site password into an API key field is how a
    // wrong secret gets saved without anyone typing it.
    const fresh = render(PasswordInput, { props: { label: 'Key' } });
    expect(input(fresh.container).getAttribute('autocomplete')).toBe('new-password');
    fresh.unmount();

    const login = render(PasswordInput, {
      props: { label: 'Password', autocomplete: 'current-password' as const },
    });
    expect(input(login.container).getAttribute('autocomplete')).toBe('current-password');
  });

  it('reports what the user typed through oninput and bindable value', async () => {
    const oninput = vi.fn();
    const { container } = render(PasswordInput, { props: { label: 'Key', oninput } });
    await fireEvent.input(input(container), { target: { value: 's3cret' } });
    expect(oninput).toHaveBeenCalledTimes(1);
    expect(input(container).value).toBe('s3cret');
  });

  it('marks the control with the stronger resting border, not the divider colour', () => {
    // line is 1.25:1 against the page. The border is the only thing marking an
    // empty control, so at that contrast the field is invisible until it is used.
    const { container } = render(PasswordInput, { props: { label: 'Key' } });
    expect(input(container).className).toContain('border-line-strong');
  });

  it('keeps the button clear of the text and its focus ring inside the control', () => {
    const { container } = render(PasswordInput, { props: { label: 'Key' } });
    expect(input(container).className).toContain('pr-10');
    // The button sits on top of the control, so an outset ring would be drawn
    // over the control's own border rather than around the button.
    expect((toggle(container) as HTMLButtonElement).className).toContain(
      'focus-visible:ring-inset',
    );
  });

  it('respects readonly and required on the control', () => {
    const { container } = render(PasswordInput, {
      props: { label: 'Key', readonly: true, required: true },
    });
    expect(input(container).readOnly).toBe(true);
    expect(input(container).required).toBe(true);
    // A password input has no ARIA role, so getByRole cannot reach it and the
    // name has to be checked through what feeds it. Nothing overrides the
    // label, and the marker inside the label is hidden, so the name is "Key"
    // and not the "Key required" the old aria-label produced.
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe(input(container).id);
    expect(input(container).hasAttribute('aria-label')).toBe(false);
    expect(input(container).hasAttribute('aria-labelledby')).toBe(false);
    const marker = label.querySelector('span') as HTMLElement;
    expect(marker.textContent).toBe('*');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.hasAttribute('aria-label')).toBe(false);
  });
});
