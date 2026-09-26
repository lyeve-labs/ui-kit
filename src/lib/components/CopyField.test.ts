import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyField from './CopyField.svelte';

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  });
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  await tick();
}

const glyph = (c: HTMLElement) => c.querySelector('[data-copy-state]')?.getAttribute('data-copy-state');

afterEach(() => {
  vi.useRealTimers();
  stubClipboard(undefined);
});

describe('CopyField', () => {
  it('shows the value read-only, labelled, with the copy control inside the field', () => {
    const { getByLabelText, getByRole, container } = render(CopyField, {
      props: { value: 'EKAREBBX4XUY', label: 'Manual entry secret' },
    });
    const input = getByLabelText('Manual entry secret') as HTMLInputElement;
    expect(input.value).toBe('EKAREBBX4XUY');
    expect(input.readOnly).toBe(true);
    expect(input.className).toContain('font-mono');
    const button = getByRole('button', { name: 'Copy manual entry secret' });
    expect(input.parentElement?.contains(button)).toBe(true);
    expect(button.getAttribute('type')).toBe('button');
    expect(container.querySelector('[data-field]')).toBeTruthy();
  });

  it('copies, turns the icon into a check, announces it and reverts', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { getByRole, container } = render(CopyField, { props: { value: 'abc', label: 'Key' } });
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent?.trim()).toBe('');
    expect(glyph(container)).toBe('idle');

    await fireEvent.click(getByRole('button'));
    await settle();
    expect(writeText).toHaveBeenCalledWith('abc');
    expect(glyph(container)).toBe('copied');
    expect(status.textContent?.trim()).toBe('Copied');
    expect(status.className).toContain('sr-only');

    vi.advanceTimersByTime(1500);
    await tick();
    expect(glyph(container)).toBe('idle');
  });

  it('says so in words when the clipboard refuses', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('Document is not focused')));
    const { getByRole, getByLabelText, container } = render(CopyField, { props: { value: 'abc', label: 'Key' } });
    await fireEvent.click(getByRole('button'));
    await settle();
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent?.trim()).toBe('Copy failed');
    expect(status.className).toContain('text-danger');
    expect(glyph(container)).toBe('idle');
    expect(getByLabelText('Key').getAttribute('aria-describedby')).toBe(status.id);
  });

  it('selects the whole value on focus', async () => {
    const { getByLabelText } = render(CopyField, { props: { value: 'abcdef', label: 'Key' } });
    const input = getByLabelText('Key') as HTMLInputElement;
    await fireEvent.focus(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 6]);
  });

  it('takes a caller name for the control and can drop the monospace', () => {
    const { getByRole, getByLabelText } = render(CopyField, {
      props: { value: 'https://x', label: 'URL', copyLabel: 'Copy the public URL', mono: false },
    });
    expect(getByRole('button', { name: 'Copy the public URL' })).toBeTruthy();
    expect(getByLabelText('URL').className).not.toContain('font-mono');
  });

  it('masks a secret, reveals it on request, and copies it either way', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { getByLabelText, getByRole } = render(CopyField, {
      props: { value: 'lyv_live_9f2', label: 'Bearer token', secret: true },
    });
    const input = getByLabelText('Bearer token') as HTMLInputElement;
    expect(input.type).toBe('password');

    await fireEvent.click(getByRole('button', { name: 'Copy bearer token' }));
    await settle();
    expect(writeText).toHaveBeenCalledWith('lyv_live_9f2');

    const reveal = getByRole('button', { name: 'Show value' });
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
    await fireEvent.click(reveal);
    expect(input.type).toBe('text');
    expect(getByRole('button', { name: 'Hide value' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('offers no reveal for a value that is not secret', () => {
    const { queryByRole } = render(CopyField, { props: { value: 'x', label: 'Key' } });
    expect(queryByRole('button', { name: 'Show value' })).toBeNull();
  });

  it("puts the caller's own actions in the row, before the reveal and the copy", () => {
    const actions = createRawSnippet(() => ({ render: () => '<button type="button" aria-label="Rotate">R</button>' }));
    const { getAllByRole } = render(CopyField, {
      props: { value: 'k', label: 'Key', secret: true, actions },
    });
    expect(getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Rotate', 'Show value', 'Copy key']);
  });
});
