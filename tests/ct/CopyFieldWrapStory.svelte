<script lang="ts">
  // A wrapped copy field held to a width, so a test reads where its lines break.
  import CopyField from '../../src/lib/components/CopyField.svelte';

  let { value, width }: { value: string; width: number } = $props();
</script>

<div style:width="{width}px">
  <CopyField label="Site ID" {value} mono wrap />
</div>
