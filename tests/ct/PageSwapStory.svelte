<script lang="ts">
  // Two pages behind one key, swapped the way a router swaps a page. Each
  // holds an Alert, whose exit plays when its page is removed.
  import Alert from '../../src/lib/components/Alert.svelte';
  import { swapPage } from '../../src/lib/motion.js';

  let { swap = false }: { swap?: boolean } = $props();
  let current = $state(1);

  function next(): void {
    if (swap) swapPage();
    current += 1;
  }
</script>

<button type="button" onclick={next}>Next page</button>
{#key current}
  <section data-page={current}>
    <h1>Page {current}</h1>
    <Alert title="Saved">Your settings were saved.</Alert>
  </section>
{/key}
