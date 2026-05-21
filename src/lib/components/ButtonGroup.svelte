<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    orientation?: 'horizontal' | 'vertical';
    class?: string;
    children: Snippet;
  }

  let { orientation = 'horizontal', class: cls = '', children }: Props = $props();
</script>

{#if orientation === 'horizontal'}
  <div
    class="inline-flex
      [&>*:not(:first-child)]:rounded-l-none
      [&>*:not(:last-child)]:rounded-r-none
      [&>*:not(:first-child)]:-ml-px
      {cls}"
  >
    {@render children()}
  </div>
{:else}
  <div
    class="inline-flex flex-col
      [&>*:not(:first-child)]:rounded-t-none
      [&>*:not(:last-child)]:rounded-b-none
      [&>*:not(:first-child)]:-mt-px
      {cls}"
  >
    {@render children()}
  </div>
{/if}
