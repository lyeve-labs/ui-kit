<script lang="ts">
  import { X } from '@lucide/svelte';
  import { CHIP_TONE, type AccentTone } from '../internal/tone.js';
  import { HIT_AREA } from '../internal/touch.js';

  interface Props {
    label: string;
    tone?: AccentTone;
    /** Draws a remove button named "Remove <label>". */
    removable?: boolean;
    /** Runs when the remove button is pressed. */
    onremove?: () => void;
    class?: string;
  }

  let {
    label,
    tone = 'neutral',
    removable = false,
    onremove = undefined,
    class: cls = '',
  }: Props = $props();
</script>

<!--
  Under a finger the remove cross takes a 44px box on a 22px tag, which
  reaches 11px above and below the tag and 8px past its end. A removable tag
  claims that room as margin there, so the boxes in a row of tags meet
  without overlapping, wrapped or not, whatever gap the row sets. That
  margin makes a removable tag 44px tall in a row, so every tag centers
  itself, and a plain tag beside it neither stretches to 44px nor sits at
  the top of the line, whatever the row aligns.
-->
<span
  class="inline-flex items-center self-center gap-1 rounded-md border px-2 py-0.5
    text-xs font-medium {removable ? 'coarse:my-2.75 coarse:me-2' : ''} {CHIP_TONE[tone]} {cls}"
>
  {label}
  {#if removable}
    <button
      type="button"
      onclick={onremove}
      aria-label="Remove {label}"
      class="{HIT_AREA} ms-0.5 rounded transition-opacity hover:opacity-60 leading-none"
    >
      <X size={12} strokeWidth={2.5} aria-hidden="true" />
    </button>
  {/if}
</span>
