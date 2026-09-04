<script lang="ts">
  /**
   * One disclosure that owns nothing but itself: an advanced-options block, a
   * long log line, a stack trace folded under an error.
   *
   * Not the native `details` element. Its open state cannot be animated, so the
   * content snaps in and out in a single frame, and it cannot be driven from
   * outside: a page that wants to open the block from a deep link or a search
   * hit has no way in. `open` here is bindable, so the page and the trigger
   * share one value.
   *
   * Accordion is the component for a set of these. It decides which of its
   * items is open, and an item asks it; this decides nothing beyond itself.
   */
  import type { Component, Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    /** The clickable summary. */
    label: string;
    /** Drawn before the label. */
    icon?: Component<{ size?: number; class?: string }>;
    /** A count or status beside the label. */
    badge?: string | number;
    disabled?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    open = $bindable(false),
    label,
    icon = undefined,
    badge = undefined,
    disabled = false,
    class: klass = '',
    children,
  }: Props = $props();

  // $props.id() and not a random string: a random id differs between the server
  // render and hydration, so aria-controls points at nothing for the first
  // paint and the two halves of the disclosure are wired to different names.
  const uid = $props.id();
  const triggerId = `${uid}-trigger`;
  const panelId = `${uid}-panel`;

  /**
   * The disabled attribute stops a user press and not a dispatched one. A click
   * sent from script reaches the handler on a disabled button, so the state
   * change is guarded here as well as on the element.
   */
  function toggle() {
    if (disabled) return;
    open = !open;
  }
</script>

<div class={klass}>
  <!-- The focus ring is inset. The trigger spans the full width of whatever
       holds it, so the global 2px outset outline is cropped by the first
       ancestor that clips.
       The hover background is dropped rather than overridden when the trigger
       is disabled: :hover still matches a disabled button, and a second
       background utility on the same element would resolve by the order
       Tailwind emits it rather than the order it was written. -->
  <button
    id={triggerId}
    type="button"
    {disabled}
    aria-expanded={open}
    aria-controls={panelId}
    onclick={toggle}
    class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium
      text-fg transition-colors duration-150 outline-none focus-visible:ring-2
      focus-visible:ring-inset focus-visible:ring-brand disabled:cursor-not-allowed
      disabled:opacity-50 {disabled ? '' : 'hover:bg-surface-2'}"
  >
    <!-- The chevron points along the axis the content moves on: right while the
         block is closed, down once it is open. -->
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0 text-faint transition-transform duration-200 ease-out {open
        ? ''
        : '-rotate-90'}"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>

    {#if icon}
      {@const Icon = icon}
      <Icon size={16} class="shrink-0 text-faint" />
    {/if}

    <span class="truncate">{label}</span>

    {#if badge !== undefined}
      <span class="ml-auto shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
        {badge}
      </span>
    {/if}
  </button>

  <!--
    A block opens to the height of its own content, which no fixed value knows.
    Animating grid-template-rows from 0fr to 1fr resolves to that height in CSS
    alone: no measuring, no reflow per frame, and nothing to correct when the
    content changes. The inner element carries the overflow so the content is
    clipped rather than spilling while the row grows.
  -->
  <div
    class="grid transition-[grid-template-rows] duration-200 ease-out {open
      ? 'grid-rows-[1fr]'
      : 'grid-rows-[0fr]'}"
  >
    <div class="overflow-hidden">
      <!--
        inert, not height alone. The content stays mounted so the row can
        animate to its height, and a subtree that is only zero pixels tall is
        still in the accessibility tree and still in the tab order: Tab lands on
        a control the reader cannot see and the page appears to lose focus.
        inert is what takes the whole subtree out of both.
      -->
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        inert={!open}
        class="px-2 pt-2 text-sm"
      >
        {@render children()}
      </div>
    </div>
  </div>
</div>
