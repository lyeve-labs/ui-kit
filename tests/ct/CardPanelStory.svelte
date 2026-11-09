<script lang="ts">
  // A padded card with a footer, holding a multi-select as its last field: a
  // site's settings, where the content types a site may bind are chosen. Styled
  // inline where the component suite loads no stylesheet of its own.
  import Card from '../../src/lib/components/Card.svelte';
  import MultiSelect from '../../src/lib/components/MultiSelect.svelte';

  const options = Array.from({ length: 12 }, (_, i) => ({
    value: `type_${i}`,
    label: `Content type ${i + 1}`,
  }));
  let value = $state<string[]>([]);
</script>

<div style="padding:24px;width:480px">
  <Card heading="Content types">
    <MultiSelect id="types" label="Content types" {options} bind:value searchable />
    {#snippet footer()}<span>Saved with the site.</span>{/snippet}
  </Card>
</div>
