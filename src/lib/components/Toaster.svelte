<script lang="ts">
  import { toast, type ToastTone } from '../stores/toast.svelte';

  const styles: Record<ToastTone, { bar: string; icon: string; mark: string }> = {
    info: { bar: 'bg-brand', icon: 'text-brand', mark: 'ℹ' },
    success: { bar: 'bg-success', icon: 'text-success', mark: '✓' },
    warn: { bar: 'bg-warn', icon: 'text-warn', mark: '!' },
    danger: { bar: 'bg-danger', icon: 'text-danger', mark: '×' },
  };
</script>

<div
  class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
>
  {#each toast.items as t (t.id)}
    <div
      class="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-lg border border-line
             bg-surface pl-0 pr-3 py-3 shadow-xl animate-[toast-in_140ms_ease-out]"
      role="status"
    >
      <span class="w-1 self-stretch shrink-0 {styles[t.tone].bar}"></span>
      <span
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold {styles[
          t.tone
        ].icon}"
        aria-hidden="true"
      >
        {styles[t.tone].mark}
      </span>
      <p class="flex-1 text-sm text-fg leading-snug">{t.message}</p>
      <button
        type="button"
        class="text-faint hover:text-fg transition-colors text-lg leading-none -mt-0.5"
        aria-label="Dismiss"
        onclick={() => toast.dismiss(t.id)}
      >
        ×
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
