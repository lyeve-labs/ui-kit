<script lang="ts">
  // A row of four options whose labels need about 380px on one line, in a
  // frame whose width the spec sets: a schema editor's transport choice in a
  // side panel. The frame is a block, a flex row with a caption beside the
  // control, or a grid of two equal columns. Styled inline, because the
  // component suite loads no stylesheet of its own.
  import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';

  let { width = 640, layout = 'block' }: { width?: number; layout?: 'block' | 'row' | 'grid' } =
    $props();
  let value = $state('both');
  const options = [
    { value: 'both', label: 'Read and write' },
    { value: 'read', label: 'Read only' },
    { value: 'write', label: 'Write only' },
    { value: 'off', label: 'Not served' },
  ];
  const frame = {
    block: '',
    row: 'display:flex;gap:8px;align-items:flex-start',
    grid: 'display:grid;grid-template-columns:1fr 1fr;gap:8px',
  };
</script>

<div id="frame" style="width:{width}px;{frame[layout]}">
  {#if layout === 'row'}<span>Transport</span>{/if}
  <SegmentedControl label="REST" bind:value {options} />
  {#if layout === 'grid'}<span>Next column</span>{/if}
</div>
<output data-testid="value">{value}</output>
