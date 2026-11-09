<script lang="ts">
  // A shell's scroll region holding a fill page, whose pane scrolls on its own
  // and holds rows below its fold, each a flex row naming its select with a
  // visually hidden label: the shape of a schema editor's field list. Styled
  // inline, because the component suite loads no stylesheet of its own.
  import PageShell from '../../src/lib/components/PageShell.svelte';

  const rows = Array.from({ length: 12 }, (_, i) => `field_${i}`);
</script>

<main
  id="region"
  style="position:relative;overflow:auto;height:300px;width:600px;display:flex;flex-direction:column"
>
  <PageShell title="Fill page" fill titleHidden>
    <div style="display:flex;flex:1;min-height:0;flex-direction:column">
      <div data-testid="pane" style="flex:1;min-height:0;overflow:auto;padding:24px">
        {#each rows as row (row)}
          <div style="display:flex;align-items:center;gap:12px;padding:12px">
            <input value={row} />
            <label class="sr-only" for="type-{row}">Type, {row}</label>
            <input id="type-{row}" value="text" />
          </div>
        {/each}
      </div>
    </div>
  </PageShell>
</main>
