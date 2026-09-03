<script lang="ts">
  import type { Snippet } from 'svelte';

  type Position = 'top' | 'bottom' | 'left' | 'right';

  interface Props {
    text: string;
    position?: Position;
    class?: string;
    children: Snippet;
  }

  let { text, position = 'top', class: cls = '', children }: Props = $props();

  let visible = $state(false);
  let wrapper = $state<HTMLElement>();

  const id = $props.id();

  const pos: Record<Position, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  /**
   * `role="tooltip"` on its own is inert: assistive technology reads a tooltip
   * only because the element it describes points at it. The trigger arrives as
   * a snippet, so the component cannot put the attribute on it at compile time
   * and wires it to the first focusable descendant instead. Without this the
   * text was visible to a sighted mouse user and to nobody else.
   */
  $effect(() => {
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
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
  onfocusin={() => (visible = true)}
  onfocusout={() => (visible = false)}
  {onkeydown}
>
  {@render children()}
  <!-- Always rendered, hidden by the `hidden` attribute rather than removed:
       aria-describedby resolves the text of a hidden element, so the trigger
       keeps a stable target. Left hoverable rather than pointer-events-none, so
       moving onto it does not dismiss it, which SC 1.4.13 also requires. -->
  <span
    {id}
    role="tooltip"
    hidden={!visible}
    class="absolute {pos[position]} z-50 max-w-[min(16rem,calc(100vw-2rem))]
      rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-fg shadow-xl"
  >
    {text}
  </span>
</span>
