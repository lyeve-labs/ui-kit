<script lang="ts">
  import { HIT_AREA } from '../internal/touch.js';
  import CopyGlyph from '../internal/CopyGlyph.svelte';
  import { COPY_FAILED_MESSAGE, CopyState } from '../internal/copy.svelte.js';

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

  const copier = new CopyState();

  const message = $derived.by(() => {
    if (copier.status === 'copied') return copiedLabel;
    if (copier.status === 'failed') return COPY_FAILED_MESSAGE;
    return '';
  });

  $effect(() => () => copier.dispose());
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
    The accessible name stays `label` through the copied copier. The live region
    below is what reports the result, and renaming the button as well would
    announce the same word twice and then leave a control called "Copied" that
    copies.
  -->
  <button
    type="button"
    aria-label={label}
    onclick={() => copier.copy(value)}
    class="{HIT_AREA} inline-flex items-center justify-center rounded-md p-1 text-faint outline-none transition-colors hover:text-fg active:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
  >
    <CopyGlyph copied={copier.status === 'copied'} {size} />
  </button>

  <span
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="text-xs {copier.status === 'failed' ? 'text-danger' : 'text-success'}">{message}</span
  >
</span>
