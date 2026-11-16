<script lang="ts">
  // A form whose submit button starts loading on submit and stays loading,
  // the way a save waits on a slow server.
  import Button from '../../src/lib/components/Button.svelte';

  let loading = $state(false);
  let submits = $state(0);
  let clicks = $state(0);
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    submits += 1;
    loading = true;
  }}
>
  <input aria-label="Name" />
  <Button type="submit" {loading}>Save</Button>
  <Button {loading} onclick={() => (clicks += 1)}>Test</Button>
</form>
<p data-testid="submits">{submits}</p>
<p data-testid="clicks">{clicks}</p>
