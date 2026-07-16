<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    icon?: string;
    iconSnippet?: Snippet;
    title: string;
    description?: string;
    class?: string;
    action?: Snippet;
    children?: Snippet;
  }

  let {
    icon = undefined,
    iconSnippet = undefined,
    title,
    description = undefined,
    class: klass = '',
    action,
    children,
  }: Props = $props();
</script>

<div
  class="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-line bg-surface/40 px-6 py-12 {klass}"
>
  {#if iconSnippet}
    <div
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted"
      aria-hidden="true"
    >
      {@render iconSnippet()}
    </div>
  {:else if icon}
    <div
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-2xl"
      aria-hidden="true"
    >
      {icon}
    </div>
  {/if}
  <h3 class="text-base font-semibold text-fg">{title}</h3>
  {#if description}
    <p class="mt-1 max-w-sm text-sm text-muted">{description}</p>
  {/if}
  {#if children}<div class="mt-1 max-w-sm text-sm text-muted">{@render children()}</div>{/if}
  {#if action}
    <div class="mt-5">{@render action()}</div>
  {/if}
</div>
