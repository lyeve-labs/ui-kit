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
      [&>*:not(:first-child)]:rounded-s-none
      [&>*:not(:last-child)]:rounded-e-none
      [&>*:not(:first-child)]:-ms-px
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
