<script lang="ts">
  /**
   * The signed-in identity and the actions that belong to it, at the end of the
   * app header.
   *
   * Where it lives is the point. The admin and the customer portal both put it
   * in the bottom left corner of the sidebar and the third console put it in the
   * header, so the same account block was in two places depending on which of
   * our own products you were looking at. The sidebar is also the worst of the
   * two: it is already full height, so opening a menu in its last row pushes
   * the last entry (Sign out, every time) past the bottom edge of the window.
   * The header has room below it by construction.
   *
   * A native `details`, not a menu assembled from buttons. The panel holds
   * links and a form post, and both have to keep working when hydration fails
   * or never runs, which is exactly the moment somebody most needs to be able
   * to sign out.
   *
   * The rows are AccountMenuItem, painted as resting sidebar rows, so the menu
   * reads as the same kind of list as the nav beside it rather than a stack of
   * boxed buttons. Sign out goes in `footer`, under a rule, because it ends
   * the session where every row above it only moves within it.
   */
  import type { Snippet } from 'svelte';
  import { TOUCH_GROW } from '../internal/touch.js';
  import { ChevronDown } from '@lucide/svelte';
  import { ROW_CHIP_TONE, type AccentTone } from '../internal/tone.js';
  import { dismissOnOutside } from '../internal/panel.js';

  interface Props {
    /** The line people recognize themselves by: a display name, or the email. */
    name: string;
    /** Under it. The email when the name is a name, otherwise a role or a plan. */
    secondary?: string;
    /** The avatar's letters. Derived from `name` when absent. */
    initials?: string;
    /** The avatar's accent. Follows the app, not the person. */
    tone?: AccentTone;
    class?: string;
    /** The menu itself: AccountMenuItem rows. */
    children: Snippet;
    /** Under a rule after the rows: the form that ends the session. */
    footer?: Snippet;
  }

  let {
    name,
    secondary = undefined,
    initials = undefined,
    tone = 'brand',
    class: klass = '',
    children,
    footer = undefined,
  }: Props = $props();

  // Splitting on the @ as well as on spaces: an account with no display name
  // shows its email here, and "ka" reads as a person where "k@" reads as a
  // rendering bug.
  const letters = $derived(
    initials ??
      (name || '?')
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join(''),
  );

  const AVATAR_TONE: Record<AccentTone, string> = {
    neutral: 'bg-surface-2 text-fg',
    ...ROW_CHIP_TONE,
  };

  let root = $state<HTMLDetailsElement | null>(null);
  let open = $state(false);

  /*
   * A `details` closes on its own summary and on nothing else, so without the
   * dismissal below the panel stays open behind whatever the reader does next.
   * Escape and an outside press are both what a menu owes. They are
   * enhancement, and the disclosure still works without either.
   */
  function closeAndReturn(): void {
    open = false;
    root?.querySelector('summary')?.focus();
  }

  /*
   * A row moves within the app, by a link or by a button that posts a form,
   * and the layout that holds the menu stays mounted, so a panel left open
   * hangs over the page the reader asked for. A pick closes it the way Escape
   * does. The row's own action still runs, because closing hides the row
   * without canceling its click. A click canceled on the row before it
   * reaches the menu is left alone, because its host acts in place, such as
   * asking first, and closing would take the focus from what it opened. A
   * Svelte host's onclick runs later, at the app's root, so the menu closes
   * first and a dialog the host opens returns the focus to the trigger.
   */
  function closeOnPick(event: MouseEvent): void {
    if (event.defaultPrevented) return;
    const row = (event.target as Element | null)?.closest('a[href], button, input');
    if (!row || !root?.contains(row)) return;
    const posts =
      (row instanceof HTMLButtonElement || row instanceof HTMLInputElement) &&
      row.type === 'submit' &&
      row.form !== null;
    if (row instanceof HTMLAnchorElement || posts) closeAndReturn();
  }

  $effect(() => {
    const el = root;
    if (!el) return;
    el.addEventListener('click', closeOnPick);
    return () => el.removeEventListener('click', closeOnPick);
  });
</script>

<details
  bind:this={root}
  bind:open
  use:dismissOnOutside={{ open, onoutside: () => (open = false), onescape: closeAndReturn }}
  class="relative {klass}"
>
  <!-- The name beside the avatar is hidden below sm, and the avatar is paint,
       so the trigger carries its name itself. While the panel is open the
       trigger keeps its hover fill, so the panel reads as coming from it. -->
  <summary
    aria-label="{name}, account menu"
    class="{TOUCH_GROW} flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-surface-2 [[open]>&]:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
  >
    <span
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold {AVATAR_TONE[
        tone
      ]}"
      aria-hidden="true"
    >
      {letters}
    </span>
    <span class="hidden min-w-0 max-w-[10rem] truncate text-sm text-fg sm:block">{name}</span>
    <ChevronDown
      size={14}
      class="shrink-0 text-faint transition-transform duration-base [[open]>summary>&]:rotate-180"
    />
  </summary>

  <!-- end-0: the panel hangs from the header's trailing edge, which is the one
       edge it can grow from without leaving the window. The surface and the
       rule are the card treatment, because lifted off the header it is a
       surface of its own. Its entrance and the trigger's open styles name
       this menu's own details: set at all times, the entrance played once
       while the panel was hidden and at no opening, and group-open followed
       any open group around the menu. -->
  <div
    class="absolute end-0 top-full z-dropdown mt-2 flex w-64 origin-top-right flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-popover inset-shadow-highlight [[open]>&]:animate-popover-in"
  >
    <div class="border-b border-line px-2 pb-2">
      <p class="truncate text-sm font-medium text-fg">{name}</p>
      {#if secondary}<p class="truncate text-xs text-muted">{secondary}</p>{/if}
    </div>
    <!-- gap-0.5 is the sidebar's row gap, so the two lists space alike. -->
    <div class="flex flex-col gap-0.5">{@render children()}</div>
    {#if footer}
      <div class="flex flex-col gap-0.5 border-t border-line pt-1">{@render footer()}</div>
    {/if}
  </div>
</details>
