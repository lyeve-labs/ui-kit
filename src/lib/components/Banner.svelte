<script lang="ts">
  import type { Snippet } from 'svelte';

  type Tone = 'info' | 'success' | 'warn' | 'danger' | 'neutral';

  interface Props {
    tone?: Tone;
    dismissible?: boolean;
    ondismiss?: () => void;
    class?: string;
    children: Snippet;
    action?: Snippet;
  }

  let {
    tone = 'info',
    dismissible = false,
    ondismiss = undefined,
    class: cls = '',
    children,
    action,
  }: Props = $props();

  let visible = $state(true);

  function dismiss() {
    visible = false;
    ondismiss?.();
  }

  const tones: Record<Tone, string> = {
    info: 'bg-brand/10 border-brand/20',
    success: 'bg-success/10 border-success/20',
    warn: 'bg-warn/10 border-warn/20',
    danger: 'bg-danger/10 border-danger/20',
    neutral: 'bg-surface-2 border-line',
  };
</script>

{#if visible}
  <div
    role="status"
    class="relative flex items-center gap-3 border-b px-4 py-3 text-sm {tones[tone]} {cls}"
  >
    <div class="flex flex-1 items-center justify-center gap-3 text-fg">
      {@render children()}
    </div>

    {#if action}
      <div class="shrink-0">{@render action()}</div>
    {/if}

    {#if dismissible}
      <button
        type="button"
        onclick={dismiss}
        aria-label="Dismiss"
        class="shrink-0 text-faint transition-colors hover:text-fg"
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
    {/if}
  </div>
{/if}
