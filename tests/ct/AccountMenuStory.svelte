<script lang="ts">
  // The two kinds of row a console puts in its account menu: a link that
  // moves within the app, and a form post in the footer. The post counts
  // itself, so a test can see that closing the menu did not cancel it.
  import AccountMenu from '../../src/lib/components/AccountMenu.svelte';
  import AccountMenuItem from '../../src/lib/components/AccountMenuItem.svelte';

  let sent = $state(0);
</script>

<div style="display:flex;justify-content:flex-end;padding:16px;width:640px">
  <AccountMenu name="Paid Journey" secondary="paid@example.com">
    <AccountMenuItem href="#settings">Account settings</AccountMenuItem>
    {#snippet footer()}
      <form
        onsubmit={(event) => {
          event.preventDefault();
          sent += 1;
        }}
      >
        <AccountMenuItem type="submit">Sign out</AccountMenuItem>
      </form>
    {/snippet}
  </AccountMenu>
  <output data-testid="sent">{sent}</output>
</div>
