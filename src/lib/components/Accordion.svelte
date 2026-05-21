<script lang="ts">
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    multiple?: boolean;
    flush?: boolean;
    class?: string;
    children: Snippet;
  }

  let { multiple = false, flush = false, class: cls = '', children }: Props = $props();

  let openSet = $state<Set<string>>(new Set());

  function toggle(id: string) {
    if (openSet.has(id)) {
      openSet.delete(id);
    } else {
      if (!multiple) openSet.clear();
      openSet.add(id);
    }
    openSet = new Set(openSet);
  }

  function isOpen(id: string): boolean {
    return openSet.has(id);
  }

  setContext<{ isOpen: (id: string) => boolean; toggle: (id: string) => void; flush: boolean }>(
    'accordion',
    {
      isOpen,
      toggle,
      get flush() {
        return flush;
      },
    },
  );
</script>

<div
  class="{flush
    ? 'divide-y divide-line'
    : 'divide-y divide-line rounded-xl border border-line overflow-hidden'} {cls}"
>
  {@render children()}
</div>
