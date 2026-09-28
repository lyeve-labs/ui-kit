<!--
  Where the reader is in a purchase, on every surface the purchase crosses.

  Buying here spans two sites: the price page configures, the portal takes the
  account and the payment. The hop between them read as arriving somewhere
  else, so the same four labels are rendered on both, from one component, and
  the reader can see that step three follows step two.

  It is an ordered list, and the step in progress carries aria-current, so the
  same information reaches a reader who cannot see the styling.
-->
<script lang="ts">
  import { cn } from '../utils/cn.js';

  interface Props {
    /** In order. Four is the most that stays readable on a phone. */
    steps: string[];
    /** Zero-based index of the step in progress. */
    current: number;
    /** Names the list for assistive technology. */
    label?: string;
    class?: string;
  }

  let { steps, current, label = 'Checkout progress', class: klass = '' }: Props = $props();
</script>

<nav aria-label={label} class={cn('w-full', klass)}>
  <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
    {#each steps as step, i (step)}
      {@const done = i < current}
      {@const here = i === current}
      <li class="flex items-center gap-2" aria-current={here ? 'step' : undefined}>
        <span
          class={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
            done && 'bg-brand/20 text-brand',
            here && 'bg-brand text-ink',
            !done && !here && 'bg-surface-2 text-faint',
          )}
          aria-hidden="true"
        >
          {i + 1}
        </span>
        <span class={cn(here ? 'font-medium text-fg' : done ? 'text-muted' : 'text-faint')}>
          {step}
        </span>
        {#if i < steps.length - 1}
          <span class="mx-1 text-faint" aria-hidden="true">/</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
