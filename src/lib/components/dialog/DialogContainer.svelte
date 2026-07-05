<script lang="ts">
  /**
   * DialogContainer — renders the dialog stack.
   *
   * Mount once near the app root (in +layout.svelte).
   * Reads from the module-level $state store — no props needed.
   *
   * Dialogs stack bottom-to-top; newest renders on top.
   * Each dialog gets its own focus trap, ESC handler, and backdrop.
   */
  import { getDialogStack } from './dialog-manager.svelte';
  import Dialog from './Dialog.svelte';
</script>

{#each getDialogStack() as entry (entry.id)}
  <Dialog {entry} />
{/each}
