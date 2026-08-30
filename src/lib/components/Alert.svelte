<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    TONE_GLYPH,
    statusTone,
    type StatusTone,
    type StatusToneInput,
  } from '../internal/tone.js';

  interface Props {
    tone?: StatusToneInput;
    title?: string;
    dismissible?: boolean;
    ondismiss?: () => void;
    class?: string;
    children?: Snippet;
  }

  let {
    tone = 'brand',
    title = undefined,
    dismissible = false,
    ondismiss = undefined,
    class: klass = '',
    children,
  }: Props = $props();

  const tones: Record<StatusTone, { wrap: string; icon: string }> = {
    neutral: { wrap: 'bg-surface-2 border-line', icon: 'text-muted' },
    brand: { wrap: 'bg-brand/8 border-brand/25', icon: 'text-brand' },
    success: { wrap: 'bg-success/8 border-success/25', icon: 'text-success' },
    warn: { wrap: 'bg-warn/8 border-warn/25', icon: 'text-warn' },
    danger: { wrap: 'bg-danger/8 border-danger/25', icon: 'text-danger' },
  };

  const t = $derived(statusTone(tone));
</script>

<div
  class="flex items-start gap-3 rounded-lg border px-4 py-3 {tones[t].wrap} {klass}"
  role="alert"
>
  <span
    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current {tones[
      t
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
      <path d={TONE_GLYPH[t]} />
    </svg>
  </span>
  <div class="flex-1 min-w-0">
    {#if title}<p class="text-sm font-semibold text-fg">{title}</p>{/if}
    {#if children}<div class="text-sm text-muted {title ? 'mt-0.5' : ''}">
        {@render children()}
      </div>{/if}
  </div>
  {#if dismissible}
    <button
      type="button"
      onclick={ondismiss}
      class="shrink-0 text-faint transition-colors duration-150 hover:text-fg"
      aria-label="Dismiss"
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
