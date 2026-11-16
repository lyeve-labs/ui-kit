<script lang="ts">
  /**
   * The row of filters and actions above a table or a list.
   *
   * Every filter row was hand-rolled, and they disagreed with each other about
   * how their controls sit: some stretched their children to the tallest one,
   * some aligned on the top edge, so a search box, a select and a button in one
   * row sat visibly off by a couple of pixels. The alignment is stated once
   * here, on their vertical centers, which is the only arrangement that holds
   * when one control is taller than the rest.
   *
   * The row wraps. A filter row that overflows takes a horizontal scrollbar the
   * user has to find before the last filter can be reached, and on a phone that
   * is every filter row.
   *
   * A row of formatting buttons is the other kind of toolbar: `tight` packs it
   * 2px apart on one line, and `roving` makes it one Tab stop, as the WAI-ARIA
   * toolbar pattern has it.
   */
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';

  interface Props {
    /** Accessible name, so a screen reader can tell two toolbars apart. */
    label?: string;
    /**
     * Makes the row's buttons one Tab stop. The stop is the last button used
     * while it stays enabled, else the first enabled one. Left and Right move
     * across the enabled buttons and wrap at the ends, and Home and End jump to
     * them. A disabled button is skipped, and a button inside an open menu,
     * listbox, dialog or radio group belongs to that widget. Only buttons
     * rove, so a text field in the row stays its own Tab stop. With Alt, Ctrl
     * or Meta held, the keys are left to the browser.
     */
    roving?: boolean;
    /** Packs the controls 2px apart on one line that does not wrap. */
    tight?: boolean;
    class?: string;
    /** Pushed to the trailing edge. */
    actions?: Snippet;
    children: Snippet;
  }

  let {
    label = undefined,
    roving = false,
    tight = false,
    class: klass = '',
    actions,
    children,
  }: Props = $props();

  let row: HTMLDivElement | undefined = $state();
  /** The button that holds the Tab stop. */
  let stop: HTMLButtonElement | null = null;
  /** Whether the focus is in the row, or was lost by a button of it turning disabled. */
  let held = false;

  /**
   * A widget inside the row moves its own focus. Only one inside the row
   * counts: a toolbar in a dialog still roves.
   */
  const WIDGETS = "[role='menu'], [role='listbox'], [role='dialog'], [role='radiogroup']";
  const own = (b: HTMLButtonElement) => {
    const widget = b.closest(WIDGETS);
    return widget === null || row === undefined || widget.contains(row);
  };
  const controls = () => [...(row?.querySelectorAll('button') ?? [])].filter(own);
  const enabled = () => controls().filter((b) => !b.disabled);

  function rove(to: HTMLButtonElement | null) {
    stop = to;
    for (const b of controls()) b.tabIndex = b === to ? 0 : -1;
  }

  function place() {
    const list = enabled();
    rove(stop !== null && list.includes(stop) ? stop : (list[0] ?? null));
  }

  /**
   * Moves the focus to the Tab stop of a roving row, and reports whether it
   * found one. A shortcut that reaches the toolbar from elsewhere calls it,
   * such as Alt+F10 in a text editor.
   */
  export function focus(): boolean {
    if (!roving) return false;
    place();
    stop?.focus();
    return stop !== null;
  }

  /*
   * The buttons are the caller's, so the stop is placed again whenever one
   * comes, goes or turns disabled. A disabled stop cannot take focus, and a
   * row whose only tabindex 0 sat on one could not be reached at all.
   *
   * A focused button that turns disabled or goes, such as Redo running out of
   * history under the keyboard, drops the focus to the page, where the next
   * arrow scrolls it. The focus follows the stop instead, unless it has moved
   * on to something else since.
   */
  const rovingFocus: Attachment<HTMLDivElement> = (node) => {
    place();
    const watch = new MutationObserver(() => {
      const was = stop;
      place();
      if (!held || was === null || (!was.disabled && was.isConnected)) return;
      const at = document.activeElement;
      if (at === null || at === document.body || at === was) stop?.focus();
    });
    watch.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled'],
    });
    const offKey = on(node, 'keydown', (e) => {
      // Alt+ArrowLeft is Back, and the other modifiers carry shortcuts too.
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const list = enabled();
      const at = list.indexOf(e.target as HTMLButtonElement);
      if (at < 0) return;
      const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: list.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      const next = list[(to + list.length) % list.length];
      rove(next);
      next.focus();
    });
    const offFocus = on(node, 'focusin', (e) => {
      held = true;
      if (e.target instanceof HTMLButtonElement && own(e.target)) rove(e.target);
    });
    // A focus that leaves for nothing, from a button that is still enabled and
    // in the row, was taken away by the reader, such as a click on the page.
    const offBlur = on(node, 'focusout', (e) => {
      const to = e.relatedTarget;
      const from = e.target;
      held =
        to instanceof Node
          ? node.contains(to)
          : from instanceof HTMLButtonElement && (from.disabled || !from.isConnected);
    });
    return () => {
      watch.disconnect();
      offKey();
      offFocus();
      offBlur();
      held = false;
      for (const b of controls()) b.removeAttribute('tabindex');
      stop = null;
    };
  };
</script>

<!-- The children are flex items of the toolbar itself rather than of a wrapper.
     A wrapper would align its own contents and leave the toolbar aligning one
     box, which is how a filter row loses the alignment it is here to keep. -->
<div
  bind:this={row}
  role="toolbar"
  aria-label={label}
  {@attach roving && rovingFocus}
  class="flex items-center {tight ? 'gap-0.5' : 'flex-wrap gap-3'} {klass}"
>
  {@render children()}

  {#if actions}
    <div class="ms-auto flex items-center {tight ? 'gap-0.5' : 'flex-wrap gap-2'}">
      {@render actions()}
    </div>
  {/if}
</div>
