<script lang="ts">
  // A page that draws its stored fold once the pane is on screen, as a page
  // does when its server render drew the default and hydration then reads the
  // reader's choice. The pane mounts only on Show, so the kit's styles are in
  // place before it first draws.
  import SplitPane from '../../src/lib/components/SplitPane.svelte';

  localStorage.removeItem('ct-fold-late');
  let shown = $state(false);
  let open = $state(true);
  let row: HTMLElement | undefined = $state();

  $effect(() => {
    if (!shown || !row) return;
    // Lays the open pane out first, so the change below is a change of a
    // drawn state and not the state it was mounted in.
    row.getBoundingClientRect();
    open = false;
  });
</script>

<button type="button" onclick={() => (shown = true)}>Show</button>
<div bind:this={row} style="display:flex;width:1000px;height:300px">
  {#if shown}
    <SplitPane
      storageKey="ct-fold-late"
      label="Layers"
      side="start"
      width={260}
      min={200}
      max={500}
      breakpoint="md"
      collapsible
      bind:open
    >
      <p>Pane body</p>
    </SplitPane>
  {/if}
  <main style="flex:1">Main</main>
</div>
