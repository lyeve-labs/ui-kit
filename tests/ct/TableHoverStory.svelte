<script lang="ts">
  // A head row, a group label row of header cells only, and two data rows:
  // every kind of row a hover could light, in the order a page shows them.
  import Table from '../../src/lib/components/Table.svelte';
</script>

<div class="bg-ink p-6">
  <Table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
      </tr>
    </thead>
    <tbody>
      <tr data-testid="label-row">
        <th scope="rowgroup" colspan="2">Active</th>
      </tr>
      <tr data-testid="first-row">
        <td>Alice</td>
        <td>Admin</td>
      </tr>
      <tr>
        <td>Bob</td>
        <td>Editor</td>
      </tr>
    </tbody>
  </Table>
</div>
