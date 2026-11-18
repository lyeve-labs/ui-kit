<script lang="ts">
  // A page shows a submit's outcome inside its own block, so the message
  // arrives with the block and leaves when the page drops it.
  import FormMessage from '../../src/lib/components/FormMessage.svelte';

  let shown = $state(false);
</script>

<button type="button" onclick={() => (shown = !shown)}>Toggle</button>
{#if shown}
  <FormMessage tone="success">Settings saved.</FormMessage>
{/if}
