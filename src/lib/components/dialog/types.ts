import type { Snippet } from 'svelte';
import type { OverlaySize } from '../../internal/layout.js';

/** The shared overlay ladder, whole: a dialog is the one surface that may hold a table. */
export type DialogSize = OverlaySize;

export interface DialogOptions<T = void> {
  /** Generated when omitted. */
  id?: string;
  title?: string | Snippet;
  body?: Snippet;
  /** Footer content (actions). If omitted and not persistent, no footer. */
  footer?: Snippet;
  size?: DialogSize;
  /** If true, backdrop click and ESC won't close the dialog */
  persistent?: boolean;
  /** Called when dialog is about to close. Return false to prevent. */
  onClose?: () => boolean | void;
  /** Resolve payload: passed to closeDialog */
  resolve?: (value: T) => void;
  /** Reject payload: passed to closeDialog */
  reject?: (reason?: unknown) => void;
}

export interface DialogEntry<T = void> {
  id: string;
  options: DialogOptions<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  /** Stack position (0 = bottom, N-1 = top) */
  depth: number;
  /** Arbitrary data passed by convenience functions (confirm, prompt, etc.) */
  meta?: Record<string, unknown>;
}
