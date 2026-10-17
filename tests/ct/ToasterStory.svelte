<script lang="ts">
  // The store lives in the page. A spec runs in Node and holds its own copy of
  // the module, so a push from the spec never reaches the Toaster it mounted.
  // Pushing here, inside the page, does.
  import Toaster from '../../src/lib/components/Toaster.svelte';
  import { toast } from '../../src/lib/stores/toast.svelte.js';

  let { message, timeout = 0 }: { message: string; timeout?: number } = $props();

  toast.push('info', message, timeout);
</script>

<Toaster />
