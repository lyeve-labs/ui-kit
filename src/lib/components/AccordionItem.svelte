<script lang="ts">
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    title: string;
    class?: string;
    children: Snippet;
  }

  let { id, title, class: cls = '', children }: Props = $props();

  const ctx = getContext<
    | {
        isOpen: (id: string) => boolean;
        toggle: (id: string) => void;
        flush: boolean;
      }
    | undefined
  >('accordion');

  let open = $derived(ctx?.isOpen(id) ?? false);
  const panelId = $derived(`accordion-panel-${id}`);
  const headerId = $derived(`accordion-header-${id}`);
</script>

<div class="bg-surface {cls}">
  <h3 class="m-0">
    <button
      type="button"
      id={headerId}
      onclick={() => ctx?.toggle(id)}
      aria-expanded={open}
      aria-controls={panelId}
      class="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium
        text-fg transition-colors duration-150 hover:bg-surface-2/50
        outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50
        {open ? 'bg-surface-2/40' : ''}"
    >
      <span>{title}</span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 text-faint transition-transform duration-200 ease-out {open
          ? 'rotate-180'
          : ''}"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  </h3>

  <!--
    A panel opens to the height of its own content, which no fixed value knows.
    Animating grid-template-rows from 0fr to 1fr resolves to that height in CSS
    alone - no measuring, no reflow on every frame, and nothing to get wrong when
    the content changes. The inner element carries the overflow so the text is
    clipped rather than spilling while the row grows.
  -->
  <div
    class="grid transition-[grid-template-rows] duration-200 ease-out {open
      ? 'grid-rows-[1fr]'
      : 'grid-rows-[0fr]'}"
  >
    <div class="overflow-hidden">
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        inert={!open}
        class="px-5 pb-4 pt-1 text-sm text-muted"
      >
        {@render children()}
      </div>
    </div>
  </div>
</div>
