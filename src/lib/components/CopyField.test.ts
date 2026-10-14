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

const glyph = (c: HTMLElement) =>
  c.querySelector('[data-copy-state]')?.getAttribute('data-copy-state');

afterEach(() => {
  vi.useRealTimers();
  stubClipboard(undefined);
});

describe('CopyField', () => {
  it('shows the value read-only, labeled, with the copy control inside the field', () => {
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
    const { getByRole, getByLabelText, container } = render(CopyField, {
      props: { value: 'abc', label: 'Key' },
    });
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
    const actions = createRawSnippet(() => ({
      render: () => '<button type="button" aria-label="Rotate">R</button>',
    }));
    const { getAllByRole } = render(CopyField, {
      props: { value: 'k', label: 'Key', secret: true, actions },
    });
    expect(getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Rotate',
      'Show value',
      'Copy key',
    ]);
  });
});

describe('CopyField wrap', () => {
  const KEY = 'demo_0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnop';

  it('stays one truncated line by default', () => {
    const { getByLabelText, container } = render(CopyField, {
      props: { value: KEY, label: 'API key' },
    });
    const input = getByLabelText('API key');
    expect(input.tagName).toBe('INPUT');
    expect(input.className).toContain('truncate');
    expect(container.querySelector('textarea')).toBeNull();
    expect(input.parentElement?.className).toContain('h-control');
  });

  it('shows the whole value on as many lines as it takes, breaking anywhere', () => {
    const { getByLabelText, container } = render(CopyField, {
      props: { value: KEY, label: 'API key', wrap: true },
    });
    const field = getByLabelText('API key') as HTMLTextAreaElement;
    expect(field.tagName).toBe('TEXTAREA');
    expect(field.value).toBe(KEY);
    expect(field.readOnly).toBe(true);
    expect(field.className).toContain('break-all');
    expect(field.className).toContain('font-mono');
    expect(field.className).not.toContain('truncate');
    expect(container.querySelector('input')).toBeNull();
    // The hidden copy sizes the textarea, and only a sighted reader meets it.
    const sizer = field.previousElementSibling as HTMLElement;
    expect(sizer.getAttribute('aria-hidden')).toBe('true');
    expect(sizer.textContent).toBe(KEY);
    expect(sizer.className).toContain('break-all');
    const frame = field.parentElement?.parentElement as HTMLElement;
    expect(frame.className).toContain('min-h-control');
    expect(frame.className).not.toMatch(/(^|\s)h-control/);
  });

  it('describes the wrapped value with the hint and selects all of it on focus', async () => {
    const { getByLabelText, getByText } = render(CopyField, {
      props: { value: KEY, label: 'API key', hint: 'Shown once', wrap: true, id: 'key' },
    });
    const field = getByLabelText('API key') as HTMLTextAreaElement;
    expect(field.id).toBe('key');
    expect(getByText('Shown once').id).toBe('key-hint');
    expect(field.getAttribute('aria-describedby')).toBe('key-hint');
    await fireEvent.focus(field);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(KEY.length);
  });

  it('follows a new value from the caller', async () => {
    const { getByLabelText, rerender } = render(CopyField, {
      props: { value: 'first', label: 'API key', wrap: true },
    });
    await rerender({ value: 'second', label: 'API key', wrap: true });
    expect((getByLabelText('API key') as HTMLTextAreaElement).value).toBe('second');
  });

  it('copies the whole wrapped value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { getByRole } = render(CopyField, {
      props: { value: KEY, label: 'API key', wrap: true },
    });
    await fireEvent.click(getByRole('button', { name: 'Copy api key' }));
    await settle();
    expect(writeText).toHaveBeenCalledWith(KEY);
  });

  it('keeps a masked secret on one line and wraps it once revealed', async () => {
    const { getByLabelText, getByRole } = render(CopyField, {
      props: { value: KEY, label: 'API key', wrap: true, secret: true },
    });
    const masked = getByLabelText('API key') as HTMLInputElement;
    expect(masked.tagName).toBe('INPUT');
    expect(masked.type).toBe('password');
    await fireEvent.click(getByRole('button', { name: 'Show value' }));
    const shown = getByLabelText('API key') as HTMLTextAreaElement;
    expect(shown.tagName).toBe('TEXTAREA');
    expect(shown.value).toBe(KEY);
    const reveal = getByRole('button', { name: 'Hide value' });
    expect(reveal.getAttribute('aria-controls')).toBe(shown.id);
  });
});
