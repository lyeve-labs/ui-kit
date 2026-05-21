<script lang="ts">
  import type { Snippet } from 'svelte';

  type Tone = 'info' | 'success' | 'warn' | 'danger';

  interface Props {
    tone?: Tone;
    title?: string;
    dismissible?: boolean;
    ondismiss?: () => void;
    class?: string;
    children?: Snippet;
  }

  let {
    tone = 'info',
    title = undefined,
    dismissible = false,
    ondismiss = undefined,
    class: klass = '',
    children,
  }: Props = $props();

  const tones: Record<Tone, { wrap: string; icon: string; mark: string }> = {
    info: { wrap: 'bg-brand/8 border-brand/25', icon: 'text-brand', mark: 'ℹ' },
    success: { wrap: 'bg-success/8 border-success/25', icon: 'text-success', mark: '✓' },
    warn: { wrap: 'bg-warn/8 border-warn/25', icon: 'text-warn', mark: '!' },
    danger: { wrap: 'bg-danger/8 border-danger/25', icon: 'text-danger', mark: '×' },
  };
</script>

<div class="flex items-start gap-3 rounded-lg border px-4 py-3 {tones[tone].wrap} {klass}" role="alert">
  <span
    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold {tones[tone].icon}"
    aria-hidden="true"
  >
    {tones[tone].mark}
  </span>
  <div class="flex-1 min-w-0">
    {#if title}<p class="text-sm font-semibold text-fg">{title}</p>{/if}
    {#if children}<div class="text-sm text-muted {title ? 'mt-0.5' : ''}">{@render children()}</div>{/if}
  </div>
  {#if dismissible}
    <button
      type="button"
      onclick={ondismiss}
      class="text-faint hover:text-fg transition-colors text-lg leading-none -mt-0.5"
      aria-label="Dismiss"
    >
      ×
    </button>
  {/if}
</div>
