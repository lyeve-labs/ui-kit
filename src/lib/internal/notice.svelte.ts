/**
 * What Alert, Banner and FormMessage share about a message that reports
 * something: when it is read out, when it clears itself and whether it can be
 * closed. The three surfaces differ in how they look, never in how they
 * behave.
 */
import type { StatusTone } from './tone.js';

/**
 * How long a confirmation holds before it clears itself.
 *
 * A toast waits 4000ms. This waits longer because it carries more: a toast is
 * one line floating over the page, and an alert or a banner is a sentence
 * sitting in the reading order, which takes a beat to find and a beat to
 * read.
 */
export const DISMISS_AFTER = 5000;

/**
 * Holds a live region's text back for two frames.
 *
 * A live region reports a change to what it holds, and a region that arrives
 * in the document with its text already inside it is not a change, so
 * nothing is read out. The region goes in empty and the text is placed inside
 * it two frames later. One frame is not enough: Firefox builds its
 * accessibility tree after the frame's callbacks run, so a region filled on
 * the first frame reaches it already full and Orca hears nothing.
 *
 * The server runs no effect and has no frames, so it renders the text
 * straight away: a page delivered without its client bundle still carries the
 * outcome of the submit, which matters more than announcing it.
 */
export function deferFill(active: () => boolean): { readonly filled: boolean } {
  let filled = $state(typeof window === 'undefined');

  $effect(() => {
    if (!active()) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => (filled = true));
    });
    return () => cancelAnimationFrame(frame);
  });

  return {
    get filled() {
      return filled;
    },
  };
}

export interface NoticeOptions {
  tone: () => StatusTone;
  dismissible: () => boolean;
  autoDismiss: () => number | boolean;
  announce: () => boolean;
  ondismiss: () => (() => void) | undefined;
}

export interface Notice {
  /** The message reads out at once, as role="alert". */
  readonly live: boolean;
  /** The message reports an outcome and is announced politely when it fills. */
  readonly outcome: boolean;
  /** The message's text is in place. False only for the two frames `deferFill` holds it. */
  readonly filled: boolean;
  /** A close button is drawn. */
  readonly closable: boolean;
  readonly closed: boolean;
  close(): void;
  /** Stops the timer while the pointer is over the message or focus is inside it. */
  hold(on: boolean): void;
}

/**
 * The behavior of a message that may report an outcome.
 *
 * A failure and a warning interrupt, because the reader has to act. Anything
 * else waits for a pause. A message that also clears itself is never
 * assertive: it would interrupt to say something and then take it away. The
 * polite branch takes no role: browsers expose role="status" as a status bar,
 * and Orca speaks nothing inserted into one.
 *
 * An outcome message arrives inside `{#if form}` already holding its text, so
 * one that clears itself or takes `announce` defers its text through
 * `deferFill`, and it is atomic, as role="status" made it, so a change reads
 * the whole message. One that states a standing condition is no live region
 * at all: it must not be read out because the page loaded, and Chrome reads a
 * polite region that a client-side navigation inserts. A failure or a warning
 * that stays is the alert branch and is never deferred.
 *
 * The message owns whether it is on screen, rather than asking the page to
 * un-render it. An outcome message lives inside `{#if form}` in the page that
 * submitted, and nothing clears a form result short of a navigation, so a
 * callback has nothing to act on. The timer stops while the message is held,
 * so text is never pulled away from somebody reading it.
 */
export function createNotice(options: NoticeOptions): Notice {
  const delay = $derived.by(() => {
    const value = options.autoDismiss();
    return value === true ? DISMISS_AFTER : Number(value) || 0;
  });
  const live = $derived((options.tone() === 'danger' || options.tone() === 'warn') && delay <= 0);
  const outcome = $derived(!live && (delay > 0 || options.announce()));
  const closable = $derived(options.dismissible() || delay > 0);
  const fill = deferFill(() => outcome);

  let closed = $state(false);
  let held = $state(false);

  function close(): void {
    closed = true;
    options.ondismiss()?.();
  }

  $effect(() => {
    if (closed || held || delay <= 0) return;
    const timer = setTimeout(close, delay);
    return () => clearTimeout(timer);
  });

  return {
    get live() {
      return live;
    },
    get outcome() {
      return outcome;
    },
    get filled() {
      return fill.filled || !outcome;
    },
    get closable() {
      return closable;
    },
    get closed() {
      return closed;
    },
    close,
    hold(on: boolean) {
      held = on;
    },
  };
}
