import type { Snippet } from 'svelte';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DialogOptions<T = void> {
  /** Unique id - auto-generated if omitted */
  id?: string;
  /** Dialog heading */
  title?: string | Snippet;
  /** Main body content */
  body?: Snippet;
  /** Footer content (actions). If omitted and not persistent, no footer. */
  footer?: Snippet;
  /** Max-width preset */
  size?: DialogSize;
  /** If true, backdrop click and ESC won't close the dialog */
  persistent?: boolean;
  /** Called when dialog is about to close. Return false to prevent. */
  onClose?: () => boolean | void;
  /** Resolve payload - passed to closeDialog */
  resolve?: (value: T) => void;
  /** Reject payload - passed to closeDialog */
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

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-3xl',
};

export function sizeClass(size: DialogSize): string {
  return SIZE_CLASSES[size];
}
