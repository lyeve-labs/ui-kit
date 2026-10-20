<script lang="ts">
  // The trigger is a snippet that has to call the toggle it is handed. A spec
  // can only pass markup, which cannot call it, so the trigger is written here.
  import Dropdown from '../../src/lib/components/Dropdown.svelte';
  import type { ComponentProps } from 'svelte';

  let { items }: { items: ComponentProps<typeof Dropdown>['items'] } = $props();
</script>

<Dropdown {items}>
  {#snippet trigger({ toggle })}
    <button type="button" onclick={toggle}>Select</button>
  {/snippet}
</Dropdown>
