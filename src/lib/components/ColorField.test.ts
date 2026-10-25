import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ColorField, { normalizeHex, type ColorSwatch } from './ColorField.svelte';

afterEach(cleanup);

const REFUSAL = 'Enter a color as # and six hex digits, such as #2F6FEB.';

describe('normalizeHex', () => {
  it.each([
    ['#2F6FEB', '#2F6FEB'],
    ['#2f6feb', '#2F6FEB'],
    ['2f6feb', '#2F6FEB'],
    [' #2F6FEB ', '#2F6FEB'],
    ['#26E', '#2266EE'],
    ['fff', '#FFFFFF'],
  ])('reads %j as %s', (input, hex) => {
    expect(normalizeHex(input)).toBe(hex);
  });

  it.each(['', 'red', 'rgb(47,111,235)', '#2F6FE', '#2F6FEB80', '#GGGGGG', '##2F6FEB', '#2F 6FEB'])(
    'refuses %j',
    (input) => {
      expect(normalizeHex(input)).toBeNull();
    },
  );
});

describe('ColorField, typed', () => {
  function setup(value = '') {
    const result = render(ColorField, {
      props: { label: 'Brand', value, hint: 'Your main color.' },
    });
    const input = result.getByLabelText('Brand') as HTMLInputElement;
    return { ...result, input };
  }

  it('stores what it reads as six upper-case digits when the reader leaves the field', async () => {
    const { input } = setup();
    await fireEvent.input(input, { target: { value: ' 2f6feb ' } });
    await fireEvent.change(input);
    expect(input.value).toBe('#2F6FEB');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('expands the short form', async () => {
    const { input } = setup();
    await fireEvent.input(input, { target: { value: '#26e' } });
    await fireEvent.change(input);
    expect(input.value).toBe('#2266EE');
  });

  it('refuses text that is no color, in place of the hint, and only once the reader leaves', async () => {
    const { input, container } = setup('#2F6FEB');
    await fireEvent.input(input, { target: { value: 'red' } });
    expect(container.textContent).not.toContain(REFUSAL);
    await fireEvent.change(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const message = container.querySelector(`#${input.getAttribute('aria-describedby')}`);
    expect(message?.textContent).toBe(REFUSAL);
    expect(container.textContent).not.toContain('Your main color.');
    // From then on the message follows the typing.
    await fireEvent.input(input, { target: { value: '#2F6' } });
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(container.textContent).toContain('Your main color.');
  });

  it('paints the stored color beside the text', () => {
    const { container } = setup('#2F6FEB');
    const swatch = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('rgb(47, 111, 235)');
  });

  it('shows a new value from the caller over what the reader typed', async () => {
    const { input, rerender } = setup('#2F6FEB');
    await fireEvent.input(input, { target: { value: 'red' } });
    await rerender({ value: '#00FF00' });
    expect(input.value).toBe('#00FF00');
  });

  it('drops what the reader typed once the caller moves off that value, even back to it', async () => {
    const { input, rerender } = setup('#2F6FEB');
    await fireEvent.input(input, { target: { value: 'red' } });
    await fireEvent.change(input);
    await rerender({ value: '#00FF00' });
    await rerender({ value: '#2F6FEB' });
    expect(input.value).toBe('#2F6FEB');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it("shows the caller's error over its own", async () => {
    const { input, container, rerender } = setup();
    await rerender({ error: 'This color is taken.' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(container.textContent).toContain('This color is taken.');
  });

  it('never draws the browser color input', () => {
    const { container } = setup();
    expect(container.querySelector('input[type="color"]')).toBeNull();
  });
});

describe('ColorField, from swatches', () => {
  const THEME: ColorSwatch[] = [
    { value: 'brand', label: 'Brand', color: '#2F6FEB' },
    { value: 'accent', label: 'Accent', color: '#F59E0B' },
    { value: 'surface', label: 'Surface', color: '#FFFFFF' },
  ];

  it('offers each swatch as a radio named by its label, holding a token name', async () => {
    const { getByRole } = render(ColorField, {
      props: { label: 'Background', swatches: THEME, value: 'brand' },
    });
    const group = getByRole('radiogroup', { name: 'Background' });
    expect(group).toBeTruthy();
    const accent = getByRole('radio', { name: 'Accent' }) as HTMLInputElement;
    expect((getByRole('radio', { name: 'Brand' }) as HTMLInputElement).checked).toBe(true);
    await fireEvent.click(accent);
    expect(accent.checked).toBe(true);
  });

  it('rings every swatch, so a white one stays in sight on a white page', () => {
    const { container } = render(ColorField, { props: { label: 'Background', swatches: THEME } });
    const marks = [...container.querySelectorAll('label > span[aria-hidden="true"]')];
    expect(marks).toHaveLength(3);
    for (const mark of marks) expect(mark.getAttribute('class')).toContain('ring-line-strong');
  });

  it('keeps a value the theme no longer offers, and says so', () => {
    const { getAllByRole, container } = render(ColorField, {
      props: { label: 'Background', swatches: THEME, value: 'brand-old', hint: 'Pick a color.' },
    });
    expect(getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false);
    expect(container.textContent).toContain(
      'The stored color brand-old is no longer in the theme.',
    );
    expect(container.textContent).not.toContain('Pick a color.');
  });

  it('sends a value the theme lost with its form until the reader picks another', async () => {
    const form = document.body.appendChild(document.createElement('form'));
    const { getByRole } = render(ColorField, {
      target: form,
      props: { label: 'Background', name: 'background', swatches: THEME, value: 'brand-old' },
    });
    expect(new FormData(form).getAll('background')).toEqual(['brand-old']);
    await fireEvent.click(getByRole('radio', { name: 'Accent' }));
    expect(new FormData(form).getAll('background')).toEqual(['accent']);
    form.remove();
  });
});
