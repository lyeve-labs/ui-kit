<script lang="ts">
  // A save button that waits on the server, beside a link button doing the same.
  import Button from '../../src/lib/components/Button.svelte';

  let loading = $state(false);
</script>

<button type="button" onclick={() => (loading = !loading)}>Toggle</button>
<div class="flex items-center gap-2 p-4">
  <Button {loading}>Save changes</Button>
  <Button href="/next" variant="secondary" {loading}>Continue</Button>
</div>
