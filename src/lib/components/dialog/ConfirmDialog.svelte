<script lang="ts">
  /**
   * ConfirmDialog - confirm/cancel pattern with async loading state.
   *
   * Renders a warning icon + message + Cancel/Confirm buttons.
   * The confirm button shows a loading spinner during async actions.
   *
   * Usage (from DialogContainer):
   *   <Dialog {entry}>
   *     <ConfirmDialog {entry} />
   *   </Dialog>
   *
   * Programmatic usage:
   *   import { confirm } from '@lyeve-labs/ui-kit';
   *   const ok = await confirm('Delete this item?', 'This action cannot be undone.');
   *   if (ok) { await deleteItem(); }
   */
  import { TriangleAlert } from '@lucide/svelte';
  import { closeDialog, dismissDialog } from './dialog-manager.svelte';
  import Button from '../Button.svelte';
  import type { DialogEntry } from './types.js';

  let {
    entry,
    /** If provided, called on confirm. Return false/throw to prevent close. */
    onConfirm,
  }: {
    entry: DialogEntry<boolean>;
    onConfirm?: () => Promise<boolean | void> | boolean | void;
  } = $props();

  let loading = $state(false);
  let title = $derived(
    typeof entry.meta?.confirmTitle === 'string' ? entry.meta.confirmTitle : 'Confirm',
  );
  let message = $derived(
    typeof entry.meta?.confirmMessage === 'string' ? entry.meta.confirmMessage : '',
  );
  let cancelLabel = $derived(
    typeof entry.meta?.cancelLabel === 'string' ? entry.meta.cancelLabel : 'Cancel',
  );
  let confirmLabel = $derived(
    typeof entry.meta?.confirmLabel === 'string' ? entry.meta.confirmLabel : 'Confirm',
  );
  // An identifier the message refers to. Set apart in monospace on its own
  // line rather than inside the sentence, where a UUID wraps mid-string.
  let detail = $derived(typeof entry.meta?.confirmDetail === 'string' ? entry.meta.confirmDetail : '');

  async function handleConfirm() {
    if (loading) return;

    try {
      loading = true;
      if (onConfirm) {
        const result = await onConfirm();
        if (result === false) {
          loading = false;
          return;
        }
      }
      loading = false;
      closeDialog(true, entry.id);
    } catch {
      loading = false;
    }
  }

  function handleCancel() {
    dismissDialog(entry.id);
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Warning icon + message -->
  <div class="flex items-start gap-3">
    <div
      class="flex items-center justify-center w-10 h-10 rounded-full bg-warn/10 text-warn shrink-0"
    >
      <TriangleAlert class="w-5 h-5" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm text-fg font-medium">{title}</p>
      {#if message}
        <p class="text-sm text-muted mt-1">{message}</p>
      {/if}
      {#if detail}
        <p class="mt-2 break-all font-mono text-xs text-faint">{detail}</p>
      {/if}
    </div>
  </div>

  <!-- Actions. Cancel takes focus first: a destructive dialog must not
       accept an Enter pressed before it was read. -->
  <div class="flex items-center justify-end gap-3 pt-2">
    <Button variant="secondary" size="sm" onclick={handleCancel} data-initial-focus>
      {cancelLabel}
    </Button>
    <Button variant="danger" size="sm" onclick={handleConfirm} {loading}>
      {confirmLabel}
    </Button>
  </div>
</div>
