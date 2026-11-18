<script lang="ts">
  // The pane takes its width from the kit's classes here, so a case that adds
  // the kit's styles sees the fold travel. The frame gives the main column
  // the rest of the row.
  import SplitPane from '../../src/lib/components/SplitPane.svelte';

  localStorage.removeItem('ct-fold');
</script>

<div style="display:flex;width:1000px;height:300px">
  <SplitPane
    storageKey="ct-fold"
    label="Layers"
    side="start"
    width={260}
    min={200}
    max={500}
    breakpoint="md"
    collapsible
  >
    <p>Pane body</p>
  </SplitPane>
  <main style="flex:1">Main</main>
</div>
