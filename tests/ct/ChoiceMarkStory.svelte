<script lang="ts">
  // A checkbox and a radio group, each with a mark to show and to hide.
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
</div>
