import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPY_REVERT_MS, CopyState, copyToClipboard } from './copy.svelte.js';

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  });
}

function stubExecCommand(result: boolean | Error) {
  const fn = vi.fn(() => {
    if (result instanceof Error) throw result;
    return result;
  });
  Object.defineProperty(document, 'execCommand', { value: fn, configurable: true, writable: true });
  return fn;
}

afterEach(() => {
  vi.useRealTimers();
  stubClipboard(undefined);
  Object.defineProperty(document, 'execCommand', {
    value: undefined,
    configurable: true,
    writable: true,
  });
});

describe('copyToClipboard', () => {
  it('uses the async clipboard when there is one', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const exec = stubExecCommand(true);
    expect(await copyToClipboard('k')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('k');
    expect(exec).not.toHaveBeenCalled();
  });

  it('falls back to the copy command on an insecure origin, and leaves nothing behind', async () => {
    const exec = stubExecCommand(true);
    expect(await copyToClipboard('k')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('falls back when writeText rejects', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('Document is not focused')));
    stubExecCommand(true);
    expect(await copyToClipboard('k')).toBe(true);
  });

  it('reports a failure when both paths refuse, without throwing', async () => {
    stubExecCommand(new Error('denied'));
    expect(await copyToClipboard('k')).toBe(false);
    stubExecCommand(false);
    expect(await copyToClipboard('k')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('CopyState', () => {
  it('starts at rest', () => {
    expect(new CopyState().status).toBe('idle');
  });

  it('confirms a copy and returns to rest on the shared clock', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const state = new CopyState();

    await state.copy('k');
    expect(writeText).toHaveBeenCalledWith('k');
    expect(state.status).toBe('copied');

    vi.advanceTimersByTime(COPY_REVERT_MS - 1);
    expect(state.status).toBe('copied');
    vi.advanceTimersByTime(1);
    expect(state.status).toBe('idle');
  });

  it('reports a refused copy on the same clock', async () => {
    vi.useFakeTimers();
    stubExecCommand(false);
    const state = new CopyState();

    await state.copy('k');
    expect(state.status).toBe('failed');
    vi.advanceTimersByTime(COPY_REVERT_MS);
    expect(state.status).toBe('idle');
  });

  it('restarts the window on a second copy', async () => {
    vi.useFakeTimers();
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const state = new CopyState();

    await state.copy('a');
    vi.advanceTimersByTime(1000);
    await state.copy('b');
    vi.advanceTimersByTime(1000);
    expect(state.status).toBe('copied');
    vi.advanceTimersByTime(COPY_REVERT_MS - 1000);
    expect(state.status).toBe('idle');
  });

  it('leaves no timer behind once disposed', async () => {
    vi.useFakeTimers();
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const state = new CopyState();

    await state.copy('k');
    expect(vi.getTimerCount()).toBe(1);
    state.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
