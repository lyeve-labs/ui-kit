<script lang="ts">
  // A page whose tab strip sits below the first screen, as a panel low on a
  // long form does.
  import Tabs from '../../src/lib/components/Tabs.svelte';
</script>

<div style="height:3000px">Top of the page</div>
<Tabs items={[{ id: 'fr', label: 'fr' }]} active="fr" onchange={() => {}} />
