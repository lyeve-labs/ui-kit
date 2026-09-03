import { afterEach, describe, expect, it } from 'vitest';
import {
  _lockBodyScroll,
  _unlockBodyScroll,
  closeDialog,
  confirm,
  dismissAllDialogs,
  dismissDialog,
  getDialogStack,
  openDialog,
  setDialogMeta,
} from './dialog-manager.svelte.js';

// The dialog stack is module-level state shared across tests. Every test below
// fully settles the dialogs it opens (resolve via closeDialog / reject via
// dismiss), so the stack returns to empty between tests. This afterEach only
// normalises the body scroll style as a belt-and-braces guard.
afterEach(() => {
  document.body.style.overflow = '';
});

describe('dialog-manager', () => {
  describe('openDialog / closeDialog', () => {
    it('pushes an entry onto the stack and resolves on close', async () => {
      const p = openDialog<string>({ id: 'a' });
      expect(getDialogStack()).toHaveLength(1);
      expect(getDialogStack()[0].id).toBe('a');
      closeDialog('done', 'a');
      await expect(p).resolves.toBe('done');
      expect(getDialogStack()).toHaveLength(0);
    });

    it('auto-generates an id when omitted', async () => {
      const p = openDialog<number>({});
      const entry = getDialogStack()[getDialogStack().length - 1];
      expect(entry.id).toMatch(/^dialog-\d+$/);
      closeDialog(1, entry.id);
      await expect(p).resolves.toBe(1);
    });

    it('closeDialog with no id closes the topmost dialog', async () => {
      const bottom = openDialog<string>({ id: 'bottom' });
      const top = openDialog<string>({ id: 'top' });
      closeDialog('top-value');
      await expect(top).resolves.toBe('top-value');
      expect(getDialogStack().map((e) => e.id)).toEqual(['bottom']);
      closeDialog('bottom-value', 'bottom');
      await expect(bottom).resolves.toBe('bottom-value');
    });

    it('closeDialog is a no-op on an empty stack', () => {
      expect(() => closeDialog('nothing')).not.toThrow();
      expect(getDialogStack()).toHaveLength(0);
    });

    it('closeDialog is a no-op for an unknown id', async () => {
      const p = openDialog<string>({ id: 'real' });
      closeDialog('x', 'ghost');
      expect(getDialogStack()).toHaveLength(1);
      closeDialog('ok', 'real');
      await expect(p).resolves.toBe('ok');
    });

    it('assigns and recomputes sequential depths', async () => {
      const p0 = openDialog({ id: 'd0' });
      const p1 = openDialog({ id: 'd1' });
      const p2 = openDialog({ id: 'd2' });
      expect(getDialogStack().map((e) => e.depth)).toEqual([0, 1, 2]);
      closeDialog(undefined, 'd0');
      expect(getDialogStack().map((e) => e.depth)).toEqual([0, 1]);
      closeDialog(undefined, 'd1');
      closeDialog(undefined, 'd2');
      await Promise.all([p0, p1, p2]);
    });
  });

  describe('onClose guard', () => {
    it('blocks close while onClose returns false, allows once it does not', async () => {
      let allow = false;
      const p = openDialog<string>({ id: 'g', onClose: () => allow });
      closeDialog('blocked', 'g');
      expect(getDialogStack()).toHaveLength(1);
      allow = true;
      closeDialog('allowed', 'g');
      await expect(p).resolves.toBe('allowed');
      expect(getDialogStack()).toHaveLength(0);
    });
  });

  describe('dismissDialog', () => {
    it('rejects with an AbortError DOMException and pops the stack', async () => {
      const p = openDialog({ id: 'x' });
      const assertion = expect(p).rejects.toMatchObject({ name: 'AbortError' });
      dismissDialog('x');
      await assertion;
      expect(getDialogStack()).toHaveLength(0);
    });

    it('with no id dismisses the topmost dialog', async () => {
      const keep = openDialog({ id: 'keep' });
      const drop = openDialog({ id: 'drop' });
      const assertion = expect(drop).rejects.toBeInstanceOf(DOMException);
      dismissDialog();
      await assertion;
      expect(getDialogStack().map((e) => e.id)).toEqual(['keep']);
      closeDialog(undefined, 'keep');
      await keep;
    });

    it('does not dismiss a persistent dialog via backdrop (no id)', () => {
      const p = openDialog({ id: 'persist', persistent: true });
      p.catch(() => {}); // handled - we reject it explicitly during cleanup
      dismissDialog();
      expect(getDialogStack()).toHaveLength(1);
      // An explicit id bypasses the persistent guard.
      dismissDialog('persist');
      expect(getDialogStack()).toHaveLength(0);
    });

    it('honours the onClose guard', async () => {
      let allow = false;
      const p = openDialog({ id: 'gd', onClose: () => allow });
      p.catch(() => {});
      dismissDialog('gd');
      expect(getDialogStack()).toHaveLength(1);
      allow = true;
      dismissDialog('gd');
      expect(getDialogStack()).toHaveLength(0);
      await expect(p).rejects.toBeInstanceOf(DOMException);
    });

    it('is a no-op for an unknown id', () => {
      expect(() => dismissDialog('missing')).not.toThrow();
    });

    it('is a no-op when called with no id on an empty stack', () => {
      expect(() => dismissDialog()).not.toThrow();
      expect(getDialogStack()).toHaveLength(0);
    });
  });

  describe('dismissAllDialogs', () => {
    it('rejects every open dialog and clears the stack', async () => {
      const p1 = openDialog({ id: 'm1' });
      const p2 = openDialog({ id: 'm2' });
      const a1 = expect(p1).rejects.toBeInstanceOf(DOMException);
      const a2 = expect(p2).rejects.toBeInstanceOf(DOMException);
      dismissAllDialogs();
      await Promise.all([a1, a2]);
      expect(getDialogStack()).toHaveLength(0);
    });

    it('leaves the scroll lock to whatever took it', () => {
      // The manager never locks. Each overlay takes one lock when it mounts and
      // releases it when it unmounts, so clearing the dialog stack must not
      // release a lock a Modal or Drawer behind it still holds. Zeroing the
      // count here let the page scroll underneath an overlay that was still up.
      _lockBodyScroll();
      expect(document.body.style.overflow).toBe('hidden');
      dismissAllDialogs();
      expect(document.body.style.overflow).toBe('hidden');
      _unlockBodyScroll();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('confirm', () => {
    it('opens a small dialog carrying confirm metadata and resolves boolean', async () => {
      const p = confirm('Delete item?', 'This cannot be undone.');
      const entry = getDialogStack()[getDialogStack().length - 1];
      expect(entry.options.size).toBe('sm');
      expect(entry.options.title).toBe('Delete item?');
      expect(entry.meta).toEqual({
        confirmTitle: 'Delete item?',
        confirmMessage: 'This cannot be undone.',
      });
      closeDialog(true, entry.id);
      await expect(p).resolves.toBe(true);
    });

    it('resolves false when the user cancels', async () => {
      // Cancelling dismisses, and dismissal rejects. Callers write
      // `if (await confirm(...))`, so rejecting on Cancel threw on the ordinary
      // path and every call site needed a try/catch to answer "no". Cancel is an
      // answer, not a failure.
      const p = confirm('Delete item?');
      const entry = getDialogStack()[getDialogStack().length - 1];
      dismissDialog(entry.id);
      await expect(p).resolves.toBe(false);
    });

    it('still rejects for a failure that is not a dismissal', async () => {
      const p = confirm('Delete item?');
      const entry = getDialogStack()[getDialogStack().length - 1];
      // Rejecting the entry directly bypasses the manager, so the stack still
      // holds it; close it too or the next test inherits a stray dialog.
      entry.reject(new Error('boom'));
      await expect(p).rejects.toThrow('boom');
      closeDialog(false, entry.id);
      expect(getDialogStack()).toHaveLength(0);
    });

    it('defaults the message to an empty string', async () => {
      const p = confirm('Sure?');
      const entry = getDialogStack()[getDialogStack().length - 1];
      expect(entry.meta).toMatchObject({ confirmMessage: '' });
      closeDialog(false, entry.id);
      await expect(p).resolves.toBe(false);
    });
  });

  describe('setDialogMeta', () => {
    it('merges metadata into an existing entry', async () => {
      const p = openDialog({ id: 'meta' });
      setDialogMeta('meta', { a: 1 });
      setDialogMeta('meta', { b: 2 });
      expect(getDialogStack()[0].meta).toEqual({ a: 1, b: 2 });
      closeDialog(undefined, 'meta');
      await p;
    });

    it('is a no-op for an unknown id', () => {
      expect(() => setDialogMeta('nope', { a: 1 })).not.toThrow();
    });
  });

  describe('body scroll lock', () => {
    it('counts nested locks and only unlocks at zero', () => {
      _lockBodyScroll();
      _lockBodyScroll();
      expect(document.body.style.overflow).toBe('hidden');
      _unlockBodyScroll();
      expect(document.body.style.overflow).toBe('hidden');
      _unlockBodyScroll();
      expect(document.body.style.overflow).toBe('');
    });

    it('clamps the counter so an extra unlock never underflows', () => {
      _unlockBodyScroll();
      expect(document.body.style.overflow).toBe('');
      _lockBodyScroll();
      expect(document.body.style.overflow).toBe('hidden');
      _unlockBodyScroll();
      expect(document.body.style.overflow).toBe('');
    });
  });
});
