<script lang="ts">
  // A page shows a submit's outcome inside its own block, so the message
  // arrives with the block and leaves when the page drops it. In a form laid
  // out as a column with a gap, the message is one of the column's rows. Every
  // neighbor is a plain div with no margin, so a jump cannot hide in one.
  import FormMessage from '../../src/lib/components/FormMessage.svelte';

  let { layout = 'block' }: { layout?: 'block' | 'gap' } = $props();

  let shown = $state(false);
</script>

<button type="button" onclick={() => (shown = !shown)}>Toggle</button>
<div class={layout === 'gap' ? 'flex flex-col gap-4' : ''}>
  <div>Above the message</div>
  {#if shown}
    <FormMessage tone="success">Settings saved.</FormMessage>
  {/if}
  <div>Below the message</div>
</div>
