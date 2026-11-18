<script lang="ts">
  // A notice placed in the three ways a page spaces its flow: a margin of its
  // own, a column with a gap and a column with space between its children.
  // Every neighbor is a plain div with no margin, so nothing the notice leaves
  // can merge into a neighbor's margin and hide a jump.
  import Alert from '../../src/lib/components/Alert.svelte';

  let { layout }: { layout: 'margin' | 'gap' | 'space' } = $props();

  let shown = $state(false);

  const flows = {
    margin: '',
    gap: 'flex flex-col gap-4',
    space: 'space-y-4',
  };
</script>

<button type="button" onclick={() => (shown = !shown)}>Toggle</button>
<div data-testid="flow" class={flows[layout]}>
  <div>Above the notice</div>
  {#if shown}
    <Alert tone="success" dismissible class={layout === 'margin' ? 'mb-4' : ''}>
      Settings saved.
    </Alert>
  {/if}
  <div>Below the notice</div>
</div>
