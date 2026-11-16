<script lang="ts">
  // An account menu whose footer item starts loading on submit and stays
  // loading, the way a sign-out waits on a slow server. The host cancels its
  // own submit, and the menu closes on the first press as it does for any
  // post, so a test opens it again to reach the loading item.
  import AccountMenu from '../../src/lib/components/AccountMenu.svelte';
  import AccountMenuItem from '../../src/lib/components/AccountMenuItem.svelte';

  let loading = $state(false);
  let sent = $state(0);
</script>

<div style="display:flex;justify-content:flex-end;padding:16px;width:640px">
  <AccountMenu name="Paid Journey">
    <AccountMenuItem href="#settings">Account settings</AccountMenuItem>
    {#snippet footer()}
      <form
        onsubmit={(event) => {
          event.preventDefault();
          sent += 1;
          loading = true;
        }}
      >
        <AccountMenuItem type="submit" {loading}>Sign out</AccountMenuItem>
      </form>
    {/snippet}
  </AccountMenu>
  <output data-testid="sent">{sent}</output>
</div>
