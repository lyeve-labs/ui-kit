<script lang="ts">
  // A pane whose tabs name what it holds, as a page editor's Blocks, Layers
  // and Sections pane does, beside a pane that shows its label. The tabs take
  // the header row, so the pane's name is not shown twice, and both rows draw
  // their rules on one line.
  import SplitPane from '../../src/lib/components/SplitPane.svelte';
  import Tabs from '../../src/lib/components/Tabs.svelte';

  let { width = 288 }: { width?: number } = $props();
  let tab = $state('layers');
</script>

<div style="display:flex;height:320px;width:1000px">
  <SplitPane
    storageKey="ct-pane-header"
    label="Blocks and layers"
    side="start"
    {width}
    min={240}
    max={480}
    breakpoint="md"
    collapsible
  >
    {#snippet header()}
      <Tabs
        items={[
          { id: 'blocks', label: 'Blocks' },
          { id: 'layers', label: 'Layers' },
          { id: 'sections', label: 'Sections' },
        ]}
        active={tab}
        onchange={(id) => (tab = id)}
        inHeader
        class="min-w-0 flex-1 [&_[role=tab]]:flex-1 [&_[role=tab]]:px-2"
      />
    {/snippet}
    <p style="padding:12px">Header, Section, Column</p>
  </SplitPane>
  <main style="flex:1">Canvas</main>
  <SplitPane
    storageKey="ct-pane-label"
    label="Properties"
    side="end"
    width={288}
    breakpoint="md"
    collapsible
  >
    <p style="padding:12px">Form</p>
  </SplitPane>
</div>
