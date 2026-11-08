<script lang="ts">
  interface Step {
    label: string;
    description?: string;
  }

  interface Props {
    /** The steps in order. `description` shows under the label. */
    steps: Step[];
    /** One-based position of the step in progress. Steps before it show a check. */
    current: number;
    /** A row across the page or a column down it. */
    orientation?: 'horizontal' | 'vertical';
    /** The list's accessible name. Name each list when a page holds two. */
    label?: string;
    class?: string;
  }

  let {
    steps,
    current,
    orientation = 'horizontal',
    label = 'Progress',
    class: cls = '',
  }: Props = $props();
</script>

{#snippet circle(idx: number)}
  <div
    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2
      font-bold text-sm transition-colors
      {idx < current
      ? 'border-brand bg-brand text-ink'
      : idx === current
        ? 'border-brand bg-surface text-brand'
        : 'border-line bg-surface text-faint'}"
  >
    {#if idx < current}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg
      >
    {:else}{idx}{/if}
  </div>
{/snippet}

{#snippet caption(step: Step, idx: number, labelSize: string, descriptionSize: string)}
  <p
    class="{labelSize} font-medium {idx === current
      ? 'text-fg'
      : idx < current
        ? 'text-muted'
        : 'text-faint'} transition-colors"
  >
    {step.label}
  </p>
  {#if step.description}
    <p class="mt-0.5 {descriptionSize} text-faint">{step.description}</p>
  {/if}
{/snippet}

{#if orientation === 'horizontal'}
  <nav aria-label={label} class="w-full {cls}">
    <ol class="flex items-start">
      {#each steps as step, i}
        {@const idx = i + 1}
        {@const done = idx < current}
        {@const active = idx === current}
        <li class="flex flex-1 flex-col items-center">
          <div class="flex w-full items-center">
            <div
              class="flex-1 {i === 0
                ? ''
                : done || active
                  ? 'bg-brand'
                  : 'bg-line'} h-px transition-colors"
            ></div>
            {@render circle(idx)}
            <div
              class="flex-1 {i === steps.length - 1
                ? ''
                : done
                  ? 'bg-brand'
                  : 'bg-line'} h-px transition-colors"
            ></div>
          </div>
          <div class="mt-2 px-1 text-center">
            {@render caption(step, idx, 'text-xs', 'text-[10px]')}
          </div>
        </li>
      {/each}
    </ol>
  </nav>
{:else}
  <nav aria-label={label} class={cls}>
    <ol class="flex flex-col">
      {#each steps as step, i}
        {@const idx = i + 1}
        <li class="flex gap-4">
          <div class="flex flex-col items-center">
            {@render circle(idx)}
            {#if i < steps.length - 1}
              <div
                class="my-1 w-px flex-1 {idx < current
                  ? 'bg-brand/40'
                  : 'bg-line'} transition-colors"
              ></div>
            {/if}
          </div>
          <div class="pb-6 pt-1">
            {@render caption(step, idx, 'text-sm', 'text-xs')}
          </div>
        </li>
      {/each}
    </ol>
  </nav>
{/if}
