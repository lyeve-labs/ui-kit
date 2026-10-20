<script lang="ts">
  // The table takes its rows as markup, and a spec can only pass markup as a
  // string, so the rows are rendered here from data.
  import Table from '../../src/lib/components/Table.svelte';

  let {
    columns,
    rows,
  }: { columns: { key: string; label: string }[]; rows: Record<string, string>[] } = $props();
</script>

<Table>
  <thead>
    <tr>
      {#each columns as column (column.key)}
        <th>{column.label}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each rows as row, index (index)}
      <tr>
        {#each columns as column (column.key)}
          <td>{row[column.key]}</td>
        {/each}
      </tr>
    {/each}
  </tbody>
</Table>
