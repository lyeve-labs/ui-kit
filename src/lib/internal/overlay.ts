/**
 * The behaviour every modal surface owes a keyboard and screen reader user.
 *
 * Dialog carried a correct implementation and Modal and Drawer carried none:
 * both declared `aria-modal="true"` while leaving focus behind them in the
 * page, so a screen reader user was told a modal had opened and then went on
 * reading the document underneath it, and a keyboard user tabbed straight out
 * of the panel with no way back. The behaviour lives here now so a fourth
 * overlay cannot ship without it.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/**
 * Elements that can hold focus. `[tabindex="-1"]` is excluded because it is
 * programmatically focusable but not part of the tab sequence, which is what
 * the trap is wrapping.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Counted rather than boolean: a dialog opened from inside a drawer must not
 * restore scrolling when only the inner one closes.
 */
let bodyLockCount = 0;

export function lockBodyScroll(): void {
  bodyLockCount++;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(): void {
  bodyLockCount--;
  if (bodyLockCount <= 0) {
    bodyLockCount = 0;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}

function focusable(node: HTMLElement): HTMLElement[] {
  return [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  );
}

/**
 * Svelte action for the panel element of a modal overlay.
 *
 *     <div use:overlay role="dialog" aria-modal="true">
 *
 * Moves focus in on mount, keeps Tab inside the panel, locks the page behind
 * it, and returns focus to whatever opened it on unmount.
 */
export function overlay(node: HTMLElement): { destroy(): void } {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  lockBodyScroll();

  // A panel with nothing focusable still has to receive focus, or the screen
  // reader stays on the element behind the overlay and reads the wrong thing.
  const first = focusable(node)[0];
  if (first) {
    first.focus();
  } else {
    node.tabIndex = -1;
    node.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const items = focusable(node);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }

    const head = items[0];
    const tail = items[items.length - 1];

    if (e.shiftKey && document.activeElement === head) {
      e.preventDefault();
      tail.focus();
    } else if (!e.shiftKey && document.activeElement === tail) {
      e.preventDefault();
      head.focus();
    }
  }

  node.addEventListener('keydown', onkeydown);

  return {
    destroy() {
      node.removeEventListener('keydown', onkeydown);
      unlockBodyScroll();
      // The opener can be gone by now, for instance a row action whose row the
      // dialog just deleted, so this is deliberately best effort.
      previous?.focus?.();
    },
  };
}
