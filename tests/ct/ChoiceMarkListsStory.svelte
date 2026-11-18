<script lang="ts">
  // The check boxes drawn by a tree, a multiple select and a plugin cart.
  import MultiSelect from '../../src/lib/components/MultiSelect.svelte';
  import PluginCart from '../../src/lib/components/PluginCart.svelte';
  import TreeView from '../../src/lib/components/TreeView.svelte';

  let checked = $state<string[]>([]);
  let tags = $state<string[]>([]);
</script>

<div style="padding: 16px; display: grid; gap: 16px; width: 720px">
  <TreeView
    label="Files"
    checkable
    bind:checked
    nodes={[
      {
        id: 'docs',
        label: 'Docs',
        children: [
          { id: 'install', label: 'Install' },
          { id: 'usage', label: 'Usage' },
        ],
      },
    ]}
  />
  <MultiSelect
    label="Tags"
    bind:value={tags}
    options={[
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]}
  />
  <PluginCart
    plugins={[{ sku: 'plugin-audit', name: 'Audit', price_cents: 500, category: 'Compliance' }]}
  />
</div>
