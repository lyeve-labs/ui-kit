import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeClipboard } from './copy.svelte.js';

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
  stubClipboard(undefined);
  Object.defineProperty(document, 'execCommand', { value: undefined, configurable: true, writable: true });
});

describe('writeClipboard', () => {
  it('uses the async clipboard when there is one', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const exec = stubExecCommand(true);
    expect(await writeClipboard('k')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('k');
    expect(exec).not.toHaveBeenCalled();
  });

  it('falls back to the copy command on an insecure origin, and leaves nothing behind', async () => {
    const exec = stubExecCommand(true);
    expect(await writeClipboard('k')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('falls back when writeText rejects', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('Document is not focused')));
    stubExecCommand(true);
    expect(await writeClipboard('k')).toBe(true);
  });

  it('reports a failure when both paths refuse, without throwing', async () => {
    stubExecCommand(new Error('denied'));
    expect(await writeClipboard('k')).toBe(false);
    stubExecCommand(false);
    expect(await writeClipboard('k')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
