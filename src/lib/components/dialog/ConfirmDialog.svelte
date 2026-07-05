<script lang="ts">
  /**
   * ConfirmDialog — confirm/cancel pattern with async loading state.
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
   *   import { confirm } from '@lyeve/ui-kit';
   *   const ok = await confirm('Delete this item?', 'This action cannot be undone.');
   *   if (ok) { await deleteItem(); }
   */
  import { TriangleAlert } from '@lucide/svelte';
  import { closeDialog, dismissDialog } from './dialog-manager.svelte';
  import Button from '../Button.svelte';
  import type { DialogEntry } from './types';

  let {
    entry,
    /** If provided, called on confirm. Return false/throw to prevent close. */
    onConfirm,
  }: {
    entry: DialogEntry<boolean>;
    onConfirm?: () => Promise<boolean | void> | boolean | void;
  } = $props();

  let loading = $state(false);
  let title = $derived((entry.meta?.confirmTitle as string) ?? 'Confirm');
  let message = $derived((entry.meta?.confirmMessage as string) ?? '');

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
      closeDialog(true, entry.id);
    } catch {
      // Stay open on error — caller shows toast
    } finally {
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
      class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 shrink-0"
    >
      <TriangleAlert class="w-5 h-5" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm text-zinc-200 font-medium">{title}</p>
      {#if message}
        <p class="text-sm text-zinc-400 mt-1">{message}</p>
      {/if}
    </div>
  </div>

  <!-- Actions -->
  <div class="flex items-center justify-end gap-3 pt-2">
    <Button variant="secondary" size="sm" onclick={handleCancel}>
      {(entry.meta?.cancelLabel as string) ?? 'Cancel'}
    </Button>
    <Button variant="danger" size="sm" onclick={handleConfirm} {loading}>
      {(entry.meta?.confirmLabel as string) ?? 'Confirm'}
    </Button>
  </div>
</div>
