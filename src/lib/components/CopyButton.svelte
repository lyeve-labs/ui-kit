<script lang="ts">
  import { HIT_AREA } from '../internal/touch.js';
  import CopyGlyph from '../internal/CopyGlyph.svelte';
  import { COPY_FAILED_MESSAGE, CopyState } from '../internal/copy.svelte.js';
  import Tooltip from './Tooltip.svelte';

  interface Props {
    /** The text written to the clipboard. */
    value: string;
    /**
     * The accessible name of a button that shows only its icon. A button with
     * `text` takes its name from that text instead.
     */
    label?: string;
    /**
     * Words shown beside the icon, such as "Copy all codes". They name the
     * button, so the name a voice-control user speaks is the one on screen.
     * Left unset, the button is the icon alone.
     */
    text?: string;
    /**
     * A tooltip on the button, shown on hover and on keyboard focus, such as
     * "Copy the signing key". It never renames the button: the name stays
     * `text`, or `label` on an icon alone. When it says more than the name, it
     * becomes the button's accessible description.
     */
    title?: string;
    /** Announced and shown after a successful copy. */
    copiedLabel?: string;
    /** Icon size in px. */
    size?: number;
    class?: string;
  }

  let {
    value,
    label = 'Copy',
    text = undefined,
    title = undefined,
    copiedLabel = 'Copied',
    size = 14,
    class: klass = '',
  }: Props = $props();

  /*
   * The icon alone sits at the faint step beside the text it copies. Words
   * read as an action of their own, so they take the muted step the kit sets
   * other text actions in, and the padding a word needs around it.
   */
  const ICON_ONLY = `${HIT_AREA} inline-flex items-center justify-center rounded-md p-1 text-faint outline-none transition-colors hover:text-fg active:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand`;
  const WITH_TEXT = `${HIT_AREA} inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted outline-none transition-colors hover:text-fg active:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand`;

  const copier = new CopyState();

  const message = $derived.by(() => {
    if (copier.status === 'copied') return copiedLabel;
    if (copier.status === 'failed') return COPY_FAILED_MESSAGE;
    return '';
  });

  $effect(() => () => copier.dispose());

  /*
   * A tooltip in the same words as the name would be announced twice, as
   * "Copy, Copy", so it is described only when it adds something.
   */
  const describes = $derived(title !== (text || label));
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
  {#if title}
    <Tooltip text={title} describe={describes}>{@render button()}</Tooltip>
  {:else}
    {@render button()}
  {/if}

  <span
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="text-xs {copier.status === 'failed' ? 'text-danger' : 'text-success'}">{message}</span
  >
</span>

{#snippet button()}
  <!--
    The accessible name stays the same through the copied state, whether it
    comes from `label` or from `text`. The live region beside it is what
    reports the result, and renaming the button as well would announce the
    same word twice and then leave a control called "Copied" that copies.
  -->
  <button
    type="button"
    aria-label={text ? undefined : label}
    onclick={() => copier.copy(value)}
    class={text ? WITH_TEXT : ICON_ONLY}
  >
    <CopyGlyph copied={copier.status === 'copied'} {size} />{#if text}{text}{/if}
  </button>
{/snippet}
