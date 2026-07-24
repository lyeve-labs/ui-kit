/**
 * Dialog Manager — module-level Svelte 5 reactive state.
 *
 * Manages a stack of dialogs. Dialogs render in last-to-first order (newest on top).
 * Each dialog returns a Promise that resolves/rejects when closed.
 *
 * Usage:
 *   import { openDialog } from '@lyeve/ui-kit';
 *   // Inside a .svelte.ts file or $effect:
 *   const result = await openDialog({ title: 'Delete?', body: mySnippet, size: 'sm' });
 *
 * For confirm/cancel pattern:
 *   import { confirm } from '@lyeve/ui-kit';
 *   const ok = await confirm('Delete this item?', 'This action cannot be undone.');
 *   if (ok) { /* ... *\/ }
 */

import type { DialogOptions, DialogEntry } from './types.js';

// ──────────────────────────────────────────────────────────
// Module-level reactive state
// ──────────────────────────────────────────────────────────

let idCounter = 0;

/** Reactive stack — topmost dialog = last element */
let stack = $state<DialogEntry<any>[]>([]);

// ──────────────────────────────────────────────────────────
// Body scroll lock (counter-based — handles stacked dialogs)
// ──────────────────────────────────────────────────────────

let bodyLockCount = 0;

export function _lockBodyScroll(): void {
  bodyLockCount++;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }
}

export function _unlockBodyScroll(): void {
  bodyLockCount--;
  if (bodyLockCount <= 0) {
    bodyLockCount = 0;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}

/** Readonly snapshot for components */
export function getDialogStack(): readonly DialogEntry<any>[] {
  return stack;
}

// ──────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────

/**
 * Open a new dialog. Returns a promise that resolves when the dialog is closed
 * (via closeDialog with a value) or rejects if dismissed without a value.
 *
 * The dialog is pushed onto the stack and becomes the topmost.
 */
export function openDialog<T = void>(options: DialogOptions<T>): Promise<T> {
  const id = options.id ?? `dialog-${++idCounter}`;

  return new Promise<T>((resolve, reject) => {
    const entry: DialogEntry<T> = {
      id,
      options: { ...options, id },
      resolve,
      reject,
      depth: stack.length,
    };

    stack = [...stack, entry];

    // Update depths for all entries (each re-renders because depth is in state)
    for (let i = 0; i < stack.length; i++) {
      stack[i].depth = i;
    }
  });
}

/**
 * Close a dialog by id and resolve its promise with a value.
 * If omitted, closes the topmost dialog.
 */
export function closeDialog<T = void>(value: T, id?: string): void {
  const targetId = id ?? stack[stack.length - 1]?.id;
  if (!targetId) return;

  const idx = stack.findIndex((e) => e.id === targetId);
  if (idx === -1) return;

  const entry = stack[idx];
  const options = entry.options;

  // Respect onClose guard
  if (options.onClose) {
    const allowed = options.onClose();
    if (allowed === false) return;
  }

  // Remove from stack
  stack = stack.filter((e) => e.id !== targetId);

  // Resolve the promise
  entry.resolve(value as T);

  // Update depths
  for (let i = 0; i < stack.length; i++) {
    stack[i].depth = i;
  }
}

/**
 * Dismiss (cancel) a dialog — rejects the promise.
 * Called when user clicks backdrop or presses ESC on a non-persistent dialog.
 */
export function dismissDialog(id?: string): void {
  const targetId = id ?? stack[stack.length - 1]?.id;
  if (!targetId) return;

  const idx = stack.findIndex((e) => e.id === targetId);
  if (idx === -1) return;

  const entry = stack[idx];
  const options = entry.options;

  // Persistent dialogs can only be dismissed programmatically (by id)
  if (options.persistent && !id) return;

  // Honor onClose guard (applies regardless of persistent)
  if (options.onClose) {
    const allowed = options.onClose();
    if (allowed === false) return;
  }

  stack = stack.filter((e) => e.id !== targetId);

  // Reject the promise — caller can .catch() or let it be
  entry.reject(new DOMException('Dialog dismissed', 'AbortError'));

  for (let i = 0; i < stack.length; i++) {
    stack[i].depth = i;
  }
}

/**
 * Close all open dialogs, rejecting their promises.
 */
export function dismissAllDialogs(): void {
  const copy = [...stack];
  stack = [];
  bodyLockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  for (const entry of copy) {
    entry.reject(new DOMException('All dialogs dismissed', 'AbortError'));
  }
}

/**
 * Convenience: confirm dialog.
 * Returns `true` if user confirmed, `false` if cancelled.
 *
 *   const ok = await confirm('Delete item?', 'This cannot be undone.');
 */
export function confirm(title: string, message?: string): Promise<boolean> {
  const id = `confirm-${++idCounter}`;
  const promise = openDialog<boolean>({ id, size: 'sm', title });
  setDialogMeta(id, { confirmTitle: title, confirmMessage: message ?? '' });
  return promise;
}

/**
 * Set metadata on a dialog entry after it's opened.
 * Used by convenience wrappers to pass extra data without polluting DialogOptions.
 */
export function setDialogMeta(id: string, meta: Record<string, unknown>): void {
  const idx = stack.findIndex((e) => e.id === id);
  if (idx === -1) return;
  stack[idx].meta = { ...stack[idx].meta, ...meta };
}
