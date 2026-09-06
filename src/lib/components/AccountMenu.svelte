<script lang="ts">
  /**
   * The signed-in identity and the actions that belong to it, at the end of the
   * app header.
   *
   * Where it lives is the point. The admin and the customer portal both put it
   * in the bottom left corner of the sidebar and the ops console put it in the
   * header, so the same account block was in two places depending on which of
   * our own products you were looking at. The sidebar is also the worst of the
   * two: it is already full height, so opening a menu in its last row pushes
   * the last entry - Sign out, every time - past the bottom edge of the window.
   * The header has room below it by construction.
   *
   * A native `details`, not a menu assembled from buttons. The panel holds
   * links and a form post, and both have to keep working when hydration fails
   * or never runs, which is exactly the moment somebody most needs to be able
   * to sign out.
   */
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import type { AccentTone } from '../internal/tone.js';

  interface Props {
    /** The line people recognise themselves by: a display name, or the email. */
    name: string;
    /** Under it. The email when the name is a name, otherwise a role or a plan. */
    secondary?: string;
    /**
     * The avatar's letters. Derived from `name` when absent, which is right far
     * more often than it is wrong.
     */
    initials?: string;
    /** The avatar's accent. Follows the app, not the person. */
    tone?: AccentTone;
    class?: string;
    /** The menu itself: links, and the form that ends the session. */
    children: Snippet;
  }

  let {
    name,
    secondary = undefined,
    initials = undefined,
    tone = 'brand',
    class: klass = '',
    children,
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
    brand: 'bg-brand/15 text-brand',
    success: 'bg-success/15 text-success',
    warn: 'bg-warn/15 text-warn',
    danger: 'bg-danger/15 text-danger',
    violet: 'bg-violet/15 text-violet',
  };

  let root = $state<HTMLDetailsElement | null>(null);

  /**
   * A `details` closes on its own summary and on nothing else, so without this
   * the panel stays open behind whatever the reader does next. Escape and an
   * outside click are both what a menu owes; they are enhancement, and the
   * disclosure still works without either.
   */
  $effect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!root?.open) return;
      if (root.contains(event.target as Node)) return;
      root.open = false;
    }
    function onKeydown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !root?.open) return;
      root.open = false;
      root.querySelector('summary')?.focus();
    }
    document.addEventListener('click', onPointerDown, { capture: true });
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('click', onPointerDown, { capture: true });
      document.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<details bind:this={root} class="group relative {klass}">
  <summary
    class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors duration-150 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
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
      class="shrink-0 text-faint transition-transform duration-150 group-open:rotate-180"
    />
  </summary>

  <!-- end-0: the panel hangs from the header's trailing edge, which is the one
       edge it can grow from without leaving the window. The surface and the
       rule are the card treatment, because lifted off the header it is a
       surface of its own. -->
  <div
    class="absolute end-0 top-full z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-2xl"
  >
    <div class="border-b border-line px-2 pb-2">
      <p class="truncate text-sm font-medium text-fg">{name}</p>
      {#if secondary}<p class="truncate text-xs text-muted">{secondary}</p>{/if}
    </div>
    {@render children()}
  </div>
</details>
