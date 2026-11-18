<script lang="ts">
  // A wide button that centers its label, and a row of a list whose button
  // starts its label and pushes a note to its far edge.
  import Button from '../../src/lib/components/Button.svelte';

  let loading = $state(false);
</script>

<button type="button" onclick={() => (loading = !loading)}>Toggle</button>
<div class="flex w-80 flex-col gap-2 p-4">
  <Button class="w-64" {loading}><span>Publish</span></Button>
  <Button variant="ghost" size="sm" class="justify-start" {loading}>
    id
    <span class="ml-auto text-xs">uuid</span>
  </Button>
</div>
