<script lang="ts">
  import { X } from '@lucide/svelte';
  import { toast } from '../stores/toast.svelte';
  import { HIT_AREA } from '../internal/touch.js';
  import { statusTone, type StatusTone } from '../internal/tone.js';
  import ToneGlyph from '../internal/ToneGlyph.svelte';
  import * as motion from '../motion.js';

  const styles: Record<StatusTone, { bar: string; icon: string }> = {
    neutral: { bar: 'bg-muted', icon: 'text-muted' },
    brand: { bar: 'bg-brand', icon: 'text-brand' },
    success: { bar: 'bg-success', icon: 'text-success' },
    warn: { bar: 'bg-warn', icon: 'text-warn' },
    danger: { bar: 'bg-danger', icon: 'text-danger' },
  };
</script>

<!-- The live region is this container, which is mounted for the life of the
     app and empty most of the time. Marking each toast `role="status"` instead
     announced nothing: assistive technology watches an existing region for
     changes, and a region that arrives already holding its text is not a
     change. It carries `aria-live` and no `role="status"`: browsers expose a
     status role as a status bar, and Orca speaks nothing inserted into one. -->
<div
  data-print="hide"
  class="pointer-events-none fixed bottom-4 end-4 z-toast flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
  aria-live="polite"
  aria-atomic="false"
>
  {#each toast.items as t (t.id)}
    <div
      transition:motion.toast|global
      animate:motion.reorder
      class="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-lg border border-line
             bg-surface ps-0 pe-3 py-3 shadow-popover inset-shadow-highlight"
    >
      <span class="w-1 self-stretch shrink-0 {styles[statusTone(t.tone)].bar}"></span>
      <ToneGlyph tone={statusTone(t.tone)} class={styles[statusTone(t.tone)].icon} />
      <p class="flex-1 text-sm text-fg leading-snug">{t.message}</p>
      <button
        type="button"
        class="{HIT_AREA} shrink-0 rounded text-faint transition-colors hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        aria-label="Close"
        onclick={() => toast.dismiss(t.id)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  {/each}
</div>
