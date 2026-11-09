<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    /** The item's id on the page, so a link can point at it. Unique on the page. */
    id: string;
    title: string;
    class?: string;
    children: Snippet;
  }

  let { id, title, class: cls = '', children }: Props = $props();

  const ctx = getContext<{ readonly name: string | undefined } | undefined>('accordion');
</script>

<!-- The browser opens and closes the item, so it works before any script
     runs and on a page that never loads one. It also shows and removes the
     body itself, so no transition sees the body leave: the body fades in on
     the way in and shuts in one frame. The entrance is set only while the
     item is open, so it plays again at each opening, and a shut body holds no
     animation that never runs. Every open style names this item's own
     details, never an open ancestor, so an item inside another open item or
     inside a page's open group still draws shut while it is shut. -->
<details {id} name={ctx?.name} class="bg-surface {cls}">
  <summary
    class="flex w-full cursor-pointer list-none items-center justify-between px-5 py-4 text-start text-sm font-medium
      text-fg transition-colors hover:bg-surface-2/50 [[open]>&]:bg-surface-2/40
      outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand
      [&::-webkit-details-marker]:hidden"
  >
    <h3 class="m-0">{title}</h3>
    <ChevronDown
      size={16}
      class="shrink-0 text-faint transition-transform duration-base [[open]>summary>&]:rotate-180"
      aria-hidden="true"
    />
  </summary>
  <div class="[[open]>&]:animate-popover-in px-5 pb-4 pt-1 text-sm text-muted">
    {@render children()}
  </div>
</details>
