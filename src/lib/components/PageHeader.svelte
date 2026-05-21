<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    class?: string;
    actions?: Snippet;
  }

  let { title, description = undefined, class: klass = '', actions }: Props = $props();
</script>

<header class="mb-8 flex flex-wrap items-start justify-between gap-4 {klass}">
  <div class="min-w-0">
    <h1 class="text-2xl font-bold text-fg">{title}</h1>
    {#if description}<p class="mt-1 text-sm text-muted">{description}</p>{/if}
  </div>
  {#if actions}
    <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
  {/if}
</header>
