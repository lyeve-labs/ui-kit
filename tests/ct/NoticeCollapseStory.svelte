<script lang="ts">
  // A notice a page shows in its flow, above content that has to move for it.
  import Alert from '../../src/lib/components/Alert.svelte';
  import Banner from '../../src/lib/components/Banner.svelte';
  import RefusalNotice from '../../src/lib/components/RefusalNotice.svelte';

  let { kind }: { kind: 'alert' | 'banner' | 'refusal' } = $props();

  let shown = $state(false);
</script>

<button type="button" onclick={() => (shown = !shown)}>Toggle</button>
<div data-testid="flow">
  {#if shown}
    {#if kind === 'alert'}
      <Alert tone="success" dismissible class="mb-3">Settings saved.</Alert>
    {:else if kind === 'banner'}
      <Banner tone="success" dismissible class="mb-3">Settings saved.</Banner>
    {:else}
      <RefusalNotice
        title="Reports are at their limit"
        body="12 of 12 are in use."
        link={{ href: '/settings', label: 'Open settings' }}
        class="mb-3"
      />
    {/if}
  {/if}
  <p>Below the notice</p>
</div>
