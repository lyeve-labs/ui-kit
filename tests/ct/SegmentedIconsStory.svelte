<script lang="ts">
  // The width switch of a page editor's top bar: four widths drawn as icons,
  // one marked for a style the selected block holds at that width.
  import { Monitor, MoveHorizontal, Smartphone, Tablet } from '@lucide/svelte';
  import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';

  let { size = 'sm' }: { size?: 'sm' | 'md' } = $props();
  let value = $state('full');
  const options = [
    { value: 'full', label: 'Full width', icon: MoveHorizontal },
    { value: 'desktop', label: 'Desktop', icon: Monitor },
    { value: 'tablet', label: 'Tablet', icon: Tablet, marked: true },
    { value: 'mobile', label: 'Mobile', icon: Smartphone },
  ];
</script>

<div id="frame" style="padding:48px 24px">
  <SegmentedControl label="Width" labelHidden iconOnly {size} bind:value {options} />
</div>
<output data-testid="value">{value}</output>
