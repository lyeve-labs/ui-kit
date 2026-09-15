<script lang="ts">
  import type { Snippet } from 'svelte';

  type Position = 'top' | 'bottom' | 'left' | 'right';

  interface Props {
    text: string;
    position?: Position;
    /**
     * Whether the text is the trigger's accessible description.
     *
     * On by default, because a tooltip that nothing points at is read by
     * nobody. Off for a trigger that already carries the same words as its
     * name: an icon-only button named by aria-label would otherwise be
     * announced as "Delete, Delete", so the hint stays visual there and the
     * name does the announcing.
     */
    describe?: boolean;
    class?: string;
    children: Snippet;
  }

  let { text, position = 'top', describe = true, class: cls = '', children }: Props = $props();

  let visible = $state(false);
  let wrapper = $state<HTMLElement>();

  const id = $props.id();

  /**
   * The box is positioned from the trigger's bounding box, fixed to the
   * viewport, rather than absolutely inside the wrapper.
   *
   * Inside the wrapper it took the wrapper's width, so a hint on an icon
   * button broke one character per line, and any ancestor that scrolls cut
   * it off: a Table's scroller is overflow-x auto, which makes its vertical
   * overflow auto as well, so a hint on a row action was clipped at the
   * header. Nothing between a fixed box and the viewport can clip it. The
   * translate carries the half of the geometry that depends on the box's own
   * size, which is not known until it renders.
   */
  const pos: Record<Position, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  };

  /** The distance between the trigger's edge and the box. */
  const GAP = 8;

  let anchor = $state({ top: 0, left: 0 });

  function place() {
    const r = wrapper?.getBoundingClientRect();
    if (!r) return;
    switch (position) {
      case 'top':
        anchor = { top: r.top - GAP, left: r.left + r.width / 2 };
        break;
      case 'bottom':
        anchor = { top: r.bottom + GAP, left: r.left + r.width / 2 };
        break;
      case 'left':
        anchor = { top: r.top + r.height / 2, left: r.left - GAP };
        break;
      case 'right':
        anchor = { top: r.top + r.height / 2, left: r.right + GAP };
        break;
    }
  }

  function show() {
    place();
    visible = true;
  }

  // A fixed box does not follow a trigger that scrolls away from under it,
  // so a scroll anywhere closes the hint rather than leaving it stranded.
  $effect(() => {
    if (!visible) return;
    const close = () => (visible = false);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  });

  /**
   * `role="tooltip"` on its own is inert: assistive technology reads a tooltip
   * only because the element it describes points at it. The trigger arrives as
   * a snippet, so the component cannot put the attribute on it at compile time
   * and wires it to the first focusable descendant instead. Without this the
   * text was visible to a sighted mouse user and to nobody else.
   */
  $effect(() => {
    if (!describe) return;
    const trigger = wrapper?.querySelector<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!trigger) return;
    trigger.setAttribute('aria-describedby', id);
    return () => trigger.removeAttribute('aria-describedby');
  });

  function onkeydown(e: KeyboardEvent) {
    // SC 1.4.13 requires content shown on hover or focus to be dismissible
    // without moving the pointer or the focus.
    if (e.key === 'Escape' && visible) {
      e.stopPropagation();
      visible = false;
    }
  }
</script>

<!-- focusin and focusout, not focus and blur. focus and blur do not bubble, so
     bound to this wrapper they never fired for the trigger inside it and the
     tooltip was unreachable by keyboard. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  bind:this={wrapper}
  class="relative inline-flex {cls}"
  onmouseenter={show}
  onmouseleave={() => (visible = false)}
  onfocusin={show}
  onfocusout={() => (visible = false)}
  {onkeydown}
>
  {@render children()}
  <!-- Always rendered, and shut with visibility rather than removed:
       aria-describedby resolves the text of a hidden element, so the trigger
       keeps a stable target. Visibility is one of the properties Tailwind's
       `transition` moves, discretely, so the hint fades and settles on the way
       in and is invisible only once it has faded out. Left hoverable rather
       than pointer-events-none, so moving onto it does not dismiss it, which
       SC 1.4.13 also requires. -->
  <span
    {id}
    role={describe ? 'tooltip' : undefined}
    aria-hidden={describe ? undefined : 'true'}
    style="top: {anchor.top}px; left: {anchor.left}px"
    class="fixed {pos[position]} z-tooltip w-max max-w-[min(16rem,calc(100vw-2rem))]
      rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-fg shadow-xl
      transition {visible
      ? 'duration-base ease-enter'
      : 'invisible scale-[0.96] opacity-0 duration-fast ease-exit'}"
  >
    {text}
  </span>
</span>
