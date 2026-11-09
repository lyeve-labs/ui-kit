<script lang="ts">
  // A shut account menu inside a page's own open group, such as an open
  // disclosure or dialog that carries the group class.
  import AccountMenu from '../../src/lib/components/AccountMenu.svelte';
  import AccountMenuItem from '../../src/lib/components/AccountMenuItem.svelte';
</script>

<details open class="group">
  <summary>Header</summary>
  <AccountMenu name="Paid Journey">
    <AccountMenuItem href="#settings">Account settings</AccountMenuItem>
  </AccountMenu>
</details>
