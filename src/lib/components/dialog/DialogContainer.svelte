<script lang="ts">
  /**
   * Renders the dialog stack.
   *
   * Mount once near the app root (in +layout.svelte). It reads the
   * module-level stack, so it takes no props.
   *
   * Dialogs stack bottom-to-top. Newest renders on top.
   * Each dialog gets its own focus trap, ESC handler, and backdrop.
   */
  import { getDialogStack } from './dialog-manager.svelte';
  import Dialog from './Dialog.svelte';
</script>

{#each getDialogStack() as entry (entry.id)}
  <Dialog {entry} />
{/each}
