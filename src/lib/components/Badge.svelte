<script lang="ts">
  import { CHIP_TONE, type AccentTone } from '../internal/tone.js';
  import type { Snippet } from 'svelte';

  type Size = 'sm' | 'md';

  interface Props {
    tone?: AccentTone;
    size?: Size;
    /** Draws a dot of the badge's tone before the label. */
    dot?: boolean;
    class?: string;
    children: Snippet;
  }

  let { tone = 'neutral', size = 'sm', dot = false, class: klass = '', children }: Props = $props();

  /** The dot carries a soft halo of its own tone. A ring is a shadow, so the dot and the label beside it do not move. */
  const dotColor: Record<AccentTone, string> = {
    neutral: 'bg-muted ring-2 ring-muted/20',
    brand: 'bg-brand ring-2 ring-brand/25',
    violet: 'bg-violet ring-2 ring-violet/25',
    success: 'bg-success ring-2 ring-success/25',
    warn: 'bg-warn ring-2 ring-warn/25',
    danger: 'bg-danger ring-2 ring-danger/25',
  };

  const sizes: Record<Size, string> = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };
</script>

<!-- whitespace-nowrap: a badge is one token and never breaks inside itself.
     Under a Table's default `overflow-wrap: anywhere` a status rendered as
     `dra ft` and a role as `sup er_a dmi n`. The label sits in a truncating
     span so a badge whose caller caps its width ends in an ellipsis instead of
     painting past its own border. With no cap the span never shrinks.

     The svg rules are what let a caller put an icon in the label. Preflight
     makes every svg a block, and a block inside the label takes a line of its
     own, so an icon and its text stacked and the badge rendered two rows tall
     inside a pill. A flex row here would fix the stacking and lose the
     ellipsis, which is the thing the span exists for, so the icon goes back to
     being inline and sits on the text's optical center. -->
<span
  class="inline-flex max-w-full items-center font-medium whitespace-nowrap rounded-full border {CHIP_TONE[
    tone
  ]} {sizes[size]} {klass}"
>
  {#if dot}<span class="w-1.5 h-1.5 shrink-0 rounded-full {dotColor[tone]}"></span>{/if}
  <span class="min-w-0 truncate [&>svg]:inline [&>svg]:align-middle">{@render children()}</span>
</span>
