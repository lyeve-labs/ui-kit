<script lang="ts">
  // A row of four options whose labels need about 380px on one line, in a
  // frame whose width the spec sets: a schema editor's transport choice in a
  // side panel. Styled inline, because the component suite loads no
  // stylesheet of its own.
  import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';

  let { width = 640 }: { width?: number } = $props();
  let value = $state('both');
  const options = [
    { value: 'both', label: 'Read and write' },
    { value: 'read', label: 'Read only' },
    { value: 'write', label: 'Write only' },
    { value: 'off', label: 'Not served' },
  ];
</script>

<div id="frame" style="width:{width}px">
  <SegmentedControl label="REST" bind:value {options} />
</div>
<output data-testid="value">{value}</output>
