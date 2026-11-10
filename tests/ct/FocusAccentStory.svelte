<script lang="ts">
  // A part of the page that sets its own brand, the way a console wraps its
  // frame in a tenant's accent. Its focus rings have to take that brand.
  import Button from '../../src/lib/components/Button.svelte';
  import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';

  let view = $state('list');
</script>

<div data-testid="accent" style="--color-brand-deep: #ff0000; padding: 16px">
  <Button variant="secondary">Save</Button>
  <SegmentedControl
    label="View"
    bind:value={view}
    options={[
      { value: 'list', label: 'List' },
      { value: 'canvas', label: 'Canvas' },
    ]}
  />
</div>
