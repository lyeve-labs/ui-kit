<script lang="ts">
  // The copy icon beside a switch that turns it into the check and back.
  import CopyGlyph from '../../src/lib/internal/CopyGlyph.svelte';

  let copied = $state(false);
</script>

<div style="padding: 16px; display: flex; gap: 16px; align-items: center">
  <button type="button" onclick={() => (copied = !copied)}>Switch</button>
  <CopyGlyph {copied} size={16} />
</div>
