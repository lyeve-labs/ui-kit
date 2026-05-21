<script lang="ts">
  type Tone = 'neutral' | 'brand' | 'violet' | 'success' | 'warn' | 'danger';

  interface Props {
    label: string;
    tone?: Tone;
    removable?: boolean;
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

  const tones: Record<Tone, string> = {
    neutral: 'bg-surface-2 text-muted border-line',
    brand: 'bg-brand/10 text-brand border-brand/20',
    violet: 'bg-violet/10 text-violet border-violet/20',
    success: 'bg-success/10 text-success border-success/20',
    warn: 'bg-warn/10 text-warn border-warn/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
  };
</script>

<span
  class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5
    text-xs font-medium {tones[tone]} {cls}"
>
  {label}
  {#if removable}
    <button
      type="button"
      onclick={onremove}
      aria-label="Remove {label}"
      class="ml-0.5 rounded transition-opacity hover:opacity-60 leading-none"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</span>
