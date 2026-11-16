<script lang="ts">
  // An idle item and a loading one, side by side on the menu's surface, so a
  // test compares what a loading item draws with an idle one and with an idle
  // one it disables itself.
  import AccountMenuItem from '../../src/lib/components/AccountMenuItem.svelte';
</script>

<div class="flex w-64 flex-col gap-0.5 bg-surface p-2">
  <div data-testid="idle"><AccountMenuItem>Sign out</AccountMenuItem></div>
  <div data-testid="loading"><AccountMenuItem loading>Sign out</AccountMenuItem></div>
  <div data-testid="disabled"><AccountMenuItem>Sign out</AccountMenuItem></div>
</div>
