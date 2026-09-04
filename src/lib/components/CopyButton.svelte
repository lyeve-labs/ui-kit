<script lang="ts">
  import { Check, Copy } from '@lucide/svelte';

  interface Props {
    /** The text written to the clipboard. */
    value: string;
    /** The button's accessible name. */
    label?: string;
    /** Announced and shown after a successful copy. */
    copiedLabel?: string;
    /** Icon size in px. */
    size?: number;
    class?: string;
  }

  let {
    value,
    label = 'Copy',
    copiedLabel = 'Copied',
    size = 14,
    class: klass = '',
  }: Props = $props();

  type Status = 'idle' | 'copied' | 'failed';

  /**
   * How long the check stays up before the button returns to its resting icon.
   *
   * Stated once. The copy affordance this replaces was hand-rolled per page, and
   * the pages that reverted at all reverted at three different speeds.
   */
  const REVERT_MS = 1500;

  /**
   * What the page says when the write did not happen.
   *
   * Every one of those hand-rolled copies reported nothing on failure: the user
   * pressed the button, the icon did not move, and the value was still only on
   * screen with no way to tell whether it had been taken.
   */
  const FAILED_MESSAGE = 'Copy failed';

  let status = $state<Status>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;

  const message = $derived.by(() => {
    if (status === 'copied') return copiedLabel;
    if (status === 'failed') return FAILED_MESSAGE;
    return '';
  });

  /** Writes the value, and reports whether it landed. */
  async function write(): Promise<boolean> {
    /*
     * The clipboard has to be read into a binding and tested. It is undefined
     * on an insecure origin, and `navigator.clipboard?.writeText(value)`
     * resolves to undefined there rather than throwing, so awaiting it succeeds
     * and the button reports a copy that never happened.
     */
    const clipboard = navigator.clipboard;
    if (!clipboard) return false;
    try {
      // writeText rejects while the document is not focused, which is what a
      // press from a background window or an inspector pane produces.
      await clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  async function copy() {
    // A second press restarts the window. Without this the first press's timer
    // reverts the second copy part way through its own.
    clearTimeout(timer);
    status = (await write()) ? 'copied' : 'failed';
    timer = setTimeout(() => (status = 'idle'), REVERT_MS);
  }

  /*
   * The revert timer outlives the component without this. A table that swaps
   * its rows while a check is up leaves the callback assigning to a destroyed
   * instance.
   */
  $effect(() => () => clearTimeout(timer));
</script>

<!--
  The live region is mounted for the life of the button and empty at rest.
  Rendering it only after a copy announces nothing: assistive technology watches
  an existing region for a change, and a region that arrives already holding its
  text is not a change. Toaster carries the same rule for the same reason.

  The gap exists only while there is a message, so an idle button is the width
  of its icon and a row of them lines up.
-->
<span class="inline-flex items-center {message ? 'gap-1.5' : ''} {klass}">
  <!--
    The accessible name stays `label` through the copied state. The live region
    below is what reports the result, and renaming the button as well would
    announce the same word twice and then leave a control called "Copied" that
    copies.
  -->
  <button
    type="button"
    aria-label={label}
    onclick={copy}
    class="inline-flex items-center justify-center rounded-md p-1 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand {status ===
    'copied'
      ? 'text-success'
      : 'text-faint hover:text-fg'}"
  >
    {#if status === 'copied'}
      <Check {size} aria-hidden="true" />
    {:else}
      <Copy {size} aria-hidden="true" />
    {/if}
  </button>

  <span
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="text-xs {status === 'failed' ? 'text-danger' : 'text-success'}">{message}</span
  >
</span>
