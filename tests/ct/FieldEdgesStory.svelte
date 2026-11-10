<script lang="ts">
  // One of each kind of field frame: a field that takes focus itself, one in
  // error, one built from a stepper row, one focused through its segments,
  // and the segmented control beside them.
  import Input from '../../src/lib/components/Input.svelte';
  import NumberInput from '../../src/lib/components/NumberInput.svelte';
  import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';
  import TimePicker from '../../src/lib/components/TimePicker.svelte';

  let view = $state('list');
</script>

<div style="padding: 16px; display: grid; gap: 16px; width: 360px">
  <Input label="Name" />
  <Input label="Email" error="Enter an email address." />
  <NumberInput label="Hours" value={1} />
  <TimePicker label="Starts" value="09:30" />
  <SegmentedControl
    label="View"
    bind:value={view}
    options={[
      { value: 'list', label: 'List' },
      { value: 'canvas', label: 'Canvas' },
    ]}
  />
</div>
