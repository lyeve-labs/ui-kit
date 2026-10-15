import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SameLabelFields from '../../../tests/fixtures/SameLabelFields.svelte';
import Input from './Input.svelte';
import NumberInput from './NumberInput.svelte';
import SearchInput from './SearchInput.svelte';
import Select from './Select.svelte';
import Textarea from './Textarea.svelte';

/** The control a field's label names, found through the label's for. */
function named(label: HTMLLabelElement): HTMLElement | null {
  return document.getElementById(label.htmlFor);
}

/**
 * A field given no id took one made from its label, so two fields under one
 * label on a page shared an id. Both labels then named the first control, and
 * the second field's hint or error was read for the first.
 */
describe('fields that share a label on one page', () => {
  it('take distinct ids, and each label names its own control', () => {
    const { container } = render(SameLabelFields);
    const fields = [...container.querySelectorAll<HTMLElement>('[data-field]')];
    expect(fields).toHaveLength(10);

    const ids = fields.map((field) => {
      const label = field.querySelector('label') as HTMLLabelElement;
      const control = named(label);
      expect(control).not.toBeNull();
      expect(field.contains(control)).toBe(true);
      return label.htmlFor;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('point each control at the message in its own field', () => {
    const { container } = render(SameLabelFields);
    for (const field of container.querySelectorAll<HTMLElement>('[data-field]')) {
      const control = named(field.querySelector('label') as HTMLLabelElement) as HTMLElement;
      const refs = control.getAttribute('aria-describedby');
      if (!refs) continue;
      for (const ref of refs.split(' ')) {
        const message = document.getElementById(ref);
        expect(message).not.toBeNull();
        expect(field.contains(message)).toBe(true);
      }
    }
  });

  const given = { id: 'billing-name', label: 'Name' };
  it.each([
    ['Input', () => render(Input, { props: given })],
    ['Textarea', () => render(Textarea, { props: given })],
    ['NumberInput', () => render(NumberInput, { props: given })],
    ['SearchInput', () => render(SearchInput, { props: given })],
    ['Select', () => render(Select, { props: given })],
  ])('%s still takes the id it is given', (_, draw) => {
    const label = draw().container.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe('billing-name');
    expect(named(label)?.id).toBe('billing-name');
  });
});
