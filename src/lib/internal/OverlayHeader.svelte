<script lang="ts">
  /** The title row Modal and Drawer share: the heading, its description and the close button. */
  import { X } from '@lucide/svelte';
  import { HIT_AREA } from './touch.js';

  interface Props {
    title: string;
    description?: string;
    headingId: string;
    descriptionId: string;
    onclose: () => void;
  }

  let { title, description, headingId, descriptionId, onclose }: Props = $props();
</script>

<div class="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
  <div>
    <h2 id={headingId} class="font-semibold text-fg">{title}</h2>
    {#if description}
      <p id={descriptionId} class="mt-0.5 text-sm text-muted">{description}</p>
    {/if}
  </div>
  <!-- 4px of padding makes the cross a 24px target under a mouse, the WCAG
       2.5.8 minimum, and the equal negative margin keeps the glyph and the
       row where they were. A finger still gets the 44px box. -->
  <button
    type="button"
    onclick={onclose}
    class="{HIT_AREA} -m-1 shrink-0 rounded p-1 text-faint transition-colors hover:text-fg
           outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
    aria-label="Close"
  >
    <X size={16} aria-hidden="true" />
  </button>
</div>
