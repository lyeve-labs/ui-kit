/**
 * The clipboard write and its outcome, shared by CopyButton and CopyField.
 *
 * Both controls report the same three states on the same clock, so a value
 * copied from a field and one copied from a code block confirm the same way.
 */

export type CopyStatus = 'idle' | 'copied' | 'failed';

/** How long the confirmation holds before the control returns to rest. */
export const COPY_REVERT_MS = 1500;

export const COPY_FAILED_MESSAGE = 'Copy failed';

/**
 * Writes to the clipboard and says whether it worked.
 *
 * The async clipboard is absent on an insecure origin, which is where a
 * self-hosted console reached over a LAN address without TLS runs, and
 * writeText rejects while the document is not focused. Either way the value
 * goes through a selected, off-screen textarea and the legacy copy command,
 * which the browser still honors inside the click. Only when that also
 * refuses is it a failure the control reports; it never throws.
 */
export async function writeClipboard(value: string): Promise<boolean> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (clipboard) {
    try {
      await clipboard.writeText(value);
      return true;
    } catch {
      // The legacy path below.
    }
  }
  return legacyCopy(value);
}

function legacyCopy(value: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export class CopyState {
  status = $state<CopyStatus>('idle');
  #timer: ReturnType<typeof setTimeout> | undefined;

  async copy(value: string): Promise<void> {
    // A second press restarts the window. Without this the first press's timer
    // reverts the second copy part way through its own.
    clearTimeout(this.#timer);
    this.status = (await writeClipboard(value)) ? 'copied' : 'failed';
    this.#timer = setTimeout(() => (this.status = 'idle'), COPY_REVERT_MS);
  }

  dispose(): void {
    clearTimeout(this.#timer);
  }
}
