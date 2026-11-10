<script lang="ts">
  // An inline checkbox and radio group, and a pair of option cards with one
  // selected, the shapes a form and a pricing page draw.
  import Checkbox from '../../src/lib/components/Checkbox.svelte';
  import RadioGroup from '../../src/lib/components/RadioGroup.svelte';

  let plan = $state('team');
</script>

<div style="padding: 16px; display: grid; gap: 16px; width: 360px">
  <Checkbox label="Remember me" />
  <RadioGroup
    label="Plan"
    bind:value={plan}
    options={[
      { value: 'solo', label: 'Solo' },
      { value: 'team', label: 'Team' },
    ]}
  />
  <Checkbox variant="card" label="Content" description="Every entry and its history." />
  <Checkbox variant="card" label="Media" description="Every upload." checked />
</div>
