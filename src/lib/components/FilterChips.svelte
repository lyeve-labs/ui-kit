<script lang="ts" module>
  import type { Component } from 'svelte';

  /** One chip. */
  export interface FilterChip<T extends string = string> {
    /** The chosen value, and the key the chip is rendered under. */
    value: T;
    /** What the reader sees. */
    label: string;
    /** How many rows this chip leaves on screen, drawn small beside the label. */
    count?: number;
    /** A lucide component before the label. */
    icon?: Component<{ size?: number; class?: string }>;
  }
</script>

<script lang="ts" generics="T extends string">
  /**
   * One filter out of many: a row of chips that wraps.
   *
   * A SegmentedControl holds two to four short options in one strip. A
   * catalog filtered by a dozen categories does not fit one: the strip either
   * scrolls, hiding categories past the edge, or squeezes each label onto two
   * lines inside its segment. Chips wrap instead, so every category is in
   * sight at every width. One is always pressed.
   */
  import { cn } from '../utils/cn.js';
  import { HIT_AREA } from '../internal/touch.js';

  interface Props {
    /** The pressed chip's value. */
    value: T;
    options: FilterChip<T>[];
    /** Names the group for assistive technology. The chips name themselves. */
    label: string;
    /** Read after the count, so "3" is heard as "3 on sale". */
    countLabel?: string;
    class?: string;
    onchange?: (value: T) => void;
  }

  let {
    value = $bindable(),
    options,
    label,
    countLabel = '',
    class: klass = '',
    onchange = undefined,
  }: Props = $props();

  function pick(next: T): void {
    if (next === value) return;
    value = next;
    onchange?.(next);
  }
</script>

<div class={cn('flex flex-wrap gap-1.5', klass)} role="group" aria-label={label}>
  {#each options as chip (chip.value)}
    {@const pressed = chip.value === value}
    <button
      type="button"
      aria-pressed={pressed}
      class={cn(
        HIT_AREA,
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        pressed
          ? 'border-brand bg-brand/10 text-fg'
          : 'border-line text-muted hover:border-line-strong hover:text-fg',
      )}
      onclick={() => pick(chip.value)}
    >
      {#if chip.icon}
        {@const Icon = chip.icon}
        <Icon size={12} class="shrink-0" />
      {/if}
      {chip.label}
      {#if chip.count !== undefined}
        <span class="font-mono text-[10px] text-faint"
          >{chip.count}{#if countLabel}<span class="sr-only"> {countLabel}</span>{/if}</span
        >
      {/if}
    </button>
  {/each}
</div>
