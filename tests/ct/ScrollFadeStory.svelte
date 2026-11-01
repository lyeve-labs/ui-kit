<script lang="ts">
  // A table and a tab strip too wide for a narrow card, so each draws the fade
  // on the edge its content continues past. The card is the surface a host
  // puts them on, and the fade has to read against it.
  import Table from '../../src/lib/components/Table.svelte';
  import Tabs from '../../src/lib/components/Tabs.svelte';

  const columns = ['Invoice', 'Issued', 'Plugins', 'Amount', 'Status', 'Receipt', 'Actions'];
  const tabs = columns.map((label) => ({ id: label, label }));
</script>

<div class="bg-surface" style="width:320px;padding:16px">
  <Table>
    <thead>
      <tr>
        {#each columns as column (column)}
          <th style="min-width:120px">{column}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      <tr>
        {#each columns as column (column)}
          <td style="height:48px"></td>
        {/each}
      </tr>
    </tbody>
  </Table>
  <Tabs items={tabs} active="Invoice" onchange={() => {}} />
</div>
