import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from './toast.svelte.js';

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Singleton store shared across the module - reset before every test.
    toast.items = [];
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('starts empty', () => {
    expect(toast.items).toEqual([]);
  });

  it('push adds a toast carrying the given tone, message and timeout', () => {
    const id = toast.push('success', 'Saved', 2000);
    expect(toast.items).toHaveLength(1);
    const t = toast.items[0];
    expect(t).toMatchObject({ id, tone: 'success', message: 'Saved', timeout: 2000 });
  });

  it('push defaults the timeout to 4000ms', () => {
    toast.push('info', 'Default timeout');
    expect(toast.items[0].timeout).toBe(4000);
  });

  it('assigns unique, monotonically increasing ids', () => {
    const a = toast.push('info', 'a');
    const b = toast.push('info', 'b');
    expect(b).toBeGreaterThan(a);
    expect(toast.items.map((t) => t.id)).toEqual([a, b]);
  });

  it('dismiss removes only the matching toast', () => {
    const a = toast.push('info', 'a');
    const b = toast.push('info', 'b');
    toast.dismiss(a);
    expect(toast.items).toHaveLength(1);
    expect(toast.items[0].id).toBe(b);
  });

  it('dismiss is a no-op for an unknown id', () => {
    toast.push('info', 'a');
    toast.dismiss(-999);
    expect(toast.items).toHaveLength(1);
  });

  it('auto-expires a toast exactly at its timeout', () => {
    toast.push('warn', 'expiring', 1000);
    expect(toast.items).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(toast.items).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(toast.items).toHaveLength(0);
  });

  it('does not schedule expiry when timeout is 0', () => {
    toast.push('info', 'sticky', 0);
    vi.advanceTimersByTime(1_000_000);
    expect(toast.items).toHaveLength(1);
  });

  it('does not schedule expiry when timeout is negative', () => {
    toast.push('info', 'sticky', -1);
    vi.advanceTimersByTime(1_000_000);
    expect(toast.items).toHaveLength(1);
  });

  it('auto-expiry only removes the timed-out toast, leaving others', () => {
    const keep = toast.push('info', 'keep', 0);
    toast.push('info', 'go', 500);
    vi.advanceTimersByTime(500);
    expect(toast.items).toHaveLength(1);
    expect(toast.items[0].id).toBe(keep);
  });

  describe('tone helpers', () => {
    it('info() uses tone "info"', () => {
      toast.info('x');
      expect(toast.items[0].tone).toBe('info');
    });

    it('success() uses tone "success"', () => {
      toast.success('x');
      expect(toast.items[0].tone).toBe('success');
    });

    it('warn() uses tone "warn"', () => {
      toast.warn('x');
      expect(toast.items[0].tone).toBe('warn');
    });

    it('error() maps to tone "danger"', () => {
      toast.error('x');
      expect(toast.items[0].tone).toBe('danger');
    });

    it('helpers forward a custom timeout', () => {
      toast.success('x', 1234);
      expect(toast.items[0].timeout).toBe(1234);
    });

    it('helpers return the new toast id', () => {
      const id = toast.info('x');
      expect(toast.items[0].id).toBe(id);
    });
  });
});
