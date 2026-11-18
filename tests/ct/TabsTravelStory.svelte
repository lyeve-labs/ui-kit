<script lang="ts">
  // A strip whose chosen tab follows the click, as a page binds it, in either
  // direction, with a control that lengthens the chosen tab's label the way a
  // count arriving or a font loading widens it. `width` narrows the strip
  // until it scrolls.
  import Tabs from '../../src/lib/components/Tabs.svelte';

  let { dir = 'ltr', width = 600 }: { dir?: 'ltr' | 'rtl'; width?: number } = $props();

  let active = $state('overview');
  let long = $state(false);
  const items = $derived([
    { id: 'overview', label: long ? 'Overview of everything' : 'Overview' },
    { id: 'activity', label: 'Activity', count: 3 },
    { id: 'settings', label: 'Settings' },
  ]);
</script>

<div {dir} style="width:{width}px">
  <Tabs {items} {active} onchange={(id) => (active = id)} />
  <button type="button" data-testid="lengthen" onclick={() => (long = true)}>Lengthen</button>
</div>
