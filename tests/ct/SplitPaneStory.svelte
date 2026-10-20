<script lang="ts">
  // The component suite loads no stylesheet, so the frame below gives the
  // pane a width, the main column the rest and the handle a box to press.
  import { untrack } from 'svelte';
  import SplitPane from '../../src/lib/components/SplitPane.svelte';

  let {
    side = 'start',
    dir = 'ltr',
    frame = 1000,
    collapsible = false,
    seed = undefined,
  }: {
    side?: 'start' | 'end';
    dir?: 'ltr' | 'rtl';
    frame?: number;
    collapsible?: boolean;
    seed?: { width: number; locked: boolean };
  } = $props();

  // Written before the pane mounts, as a width stored on an earlier visit.
  const first = untrack(() => seed);
  if (first) localStorage.setItem('ct-pane', JSON.stringify(first));
  else localStorage.removeItem('ct-pane');
</script>

<div class="frame" {dir} style="width:{frame}px">
  {#if side === 'end'}<main class="main">Main</main>{/if}
  <SplitPane
    storageKey="ct-pane"
    label="Layers"
    {side}
    width={260}
    min={200}
    max={500}
    breakpoint="md"
    {collapsible}
  >
    <p>Pane body</p>
  </SplitPane>
  {#if side === 'start'}<main class="main">Main</main>{/if}
</div>

<style>
  .frame {
    display: flex;
    height: 300px;
  }
  .frame :global(aside) {
    flex: none;
    width: min(var(--panel-w), calc(100% - var(--panel-min)));
  }
  .frame :global([role='separator']) {
    display: block;
    width: 8px;
    height: 40px;
    background: gray;
  }
  .main {
    flex: 1;
  }
</style>
