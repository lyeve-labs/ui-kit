import type { StatusToneInput } from '../internal/tone.js';

/**
 * A toast carries the same tone vocabulary as Alert and Banner. `brand` is the
 * canonical name; `info` is kept because `toast.info(...)` already ships.
 */
export type ToastTone = StatusToneInput;

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  timeout: number;
}

let seq = 0;

class ToastStore {
  items = $state<Toast[]>([]);

  push(tone: ToastTone, message: string, timeout = 4000): number {
    const id = ++seq;
    this.items.push({ id, tone, message, timeout });
    if (timeout > 0) {
      setTimeout(() => this.dismiss(id), timeout);
    }
    return id;
  }

  dismiss(id: number): void {
    this.items = this.items.filter((t) => t.id !== id);
  }

  info(message: string, timeout?: number): number {
    return this.push('brand', message, timeout);
  }
  success(message: string, timeout?: number): number {
    return this.push('success', message, timeout);
  }
  warn(message: string, timeout?: number): number {
    return this.push('warn', message, timeout);
  }
  error(message: string, timeout?: number): number {
    return this.push('danger', message, timeout);
  }
}

export const toast = new ToastStore();
