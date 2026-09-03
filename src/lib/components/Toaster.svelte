<script lang="ts">
  import { toast } from '../stores/toast.svelte';
  import { TONE_GLYPH, statusTone, type StatusTone } from '../internal/tone.js';

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
     change. -->
<div
  class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
  role="status"
  aria-live="polite"
  aria-atomic="false"
>
  {#each toast.items as t (t.id)}
    <div
      class="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-lg border border-line
             bg-surface pl-0 pr-3 py-3 shadow-xl animate-[toast-in_140ms_ease-out]"
    >
      <span class="w-1 self-stretch shrink-0 {styles[statusTone(t.tone)].bar}"></span>
      <span
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current {styles[
          statusTone(t.tone)
        ].icon}"
        aria-hidden="true"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d={TONE_GLYPH[statusTone(t.tone)]} />
        </svg>
      </span>
      <p class="flex-1 text-sm text-fg leading-snug">{t.message}</p>
      <button
        type="button"
        class="shrink-0 rounded text-faint transition-colors duration-150 hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        aria-label="Dismiss"
        onclick={() => toast.dismiss(t.id)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
        >
      </button>
    </div>
  {/each}
</div>

<style>
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateX(12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
