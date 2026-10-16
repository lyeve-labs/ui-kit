<script lang="ts">
  /*
   * A group Field around each group control the kit ships, wired the way the
   * Field notes say: a SegmentedControl through labeledBy with its own caption
   * hidden, FilterChips through its own label carrying the caption's words.
   */
  import { Field, FilterChips, SegmentedControl } from '../../src/lib/index.js';

  const windows = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
  ];
  const sources = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
  ];
  let span = $state('24h');
  let source = $state('csv');
</script>

<Field label="Window" hint="Charts cover this window." group>
  {#snippet children({ id, describedBy, labeledBy })}
    <SegmentedControl
      {id}
      {describedBy}
      {labeledBy}
      label="Window"
      labelHidden
      options={windows}
      bind:value={span}
    />
  {/snippet}
</Field>

<Field label="Import from" hint="One source per run." group>
  {#snippet children({ id, describedBy })}
    <FilterChips {id} {describedBy} label="Import from" options={sources} bind:value={source} />
  {/snippet}
</Field>
