import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Input from './Input.svelte';

describe('Input', () => {
  it('renders a label and links it to the input via a derived id', () => {
    const { container, getByText } = render(Input, { props: { label: 'Email Address' } });
    expect(getByText('Email Address')).toBeTruthy();
    const input = container.querySelector('input') as HTMLInputElement;
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(input.id).toBe('email-address');
    expect(label.getAttribute('for')).toBe('email-address');
  });

  it('shows a required marker', () => {
    const { container } = render(Input, { props: { label: 'Name', required: true } });
    const marker = container.querySelector('span.text-danger');
    expect(marker?.textContent).toBe('*');
  });

  it('applies the placeholder and type', () => {
    const { container } = render(Input, {
      props: { type: 'email', placeholder: 'you@site.com' },
    });
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('type')).toBe('email');
    expect(input.getAttribute('placeholder')).toBe('you@site.com');
  });

  it('renders the current value', () => {
    const { container } = render(Input, { props: { value: 'hello' } });
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('hello');
  });

  it('shows an error message, marks aria-invalid and uses the danger border', () => {
    const { container, getByText } = render(Input, { props: { error: 'Required field' } });
    expect(getByText('Required field').className).toContain('text-danger');
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.className).toContain('border-danger');
  });

  it('shows a hint when there is no error', () => {
    const { getByText } = render(Input, { props: { hint: 'We never share it' } });
    expect(getByText('We never share it').className).toContain('text-faint');
  });

  it('hides the hint when an error is present', () => {
    const { queryByText } = render(Input, {
      props: { hint: 'a hint', error: 'an error' },
    });
    expect(queryByText('a hint')).toBeNull();
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Input, { props: { disabled: true } });
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});
