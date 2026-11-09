<script lang="ts">
  /**
   * One row of the account menu: a link, or a button for the form that ends
   * the session.
   *
   * It is painted as a resting sidebar row, because the menu is the same kind
   * of list one corner over. The menu used to hold full-width outlined
   * buttons, which drew each entry as a box of its own and Sign out as a red
   * bar. Sign out is an ordinary row: ending a session loses nothing, so it
   * carries no warning color.
   *
   * px-2 rather than the sidebar's inline token, so the icon lines up with the
   * name in the panel's header above it.
   */
  import type { Component, Snippet } from 'svelte';
  import { TOUCH_GROW } from '../internal/touch.js';
  import { NAV_ROW, NAV_ROW_REST } from '../internal/layout.js';
  import { safeHref } from '../internal/href.js';
  import Spinner from './Spinner.svelte';

  interface Props {
    /** A link when given, otherwise a button. */
    href?: string;
    target?: string;
    rel?: string;
    /** Only for the button. `submit` posts the form around it. */
    type?: 'button' | 'submit';
    icon?: Component<{ size?: number; class?: string }>;
    /**
     * The submit is in flight. The button refuses a second press and the icon
     * turns into a spinner of the same size, so the label does not move. The
     * menu closes on the press, so the spinner shows when the reader opens it
     * again before the submit ends.
     */
    loading?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    href = undefined,
    target = undefined,
    rel = undefined,
    type = 'button',
    icon = undefined,
    loading = false,
    class: klass = '',
    children,
  }: Props = $props();

  // SidebarNav's row and its resting paint, with the inline padding noted above.
  const ROW = `${TOUCH_GROW} ${NAV_ROW} px-2 ${NAV_ROW_REST}`;
</script>

{#snippet body()}
  {#if loading}
    <Spinner size={16} />
  {:else if icon}
    {@const Icon = icon}
    <span class="flex shrink-0" aria-hidden="true"><Icon size={16} class="shrink-0" /></span>
  {/if}
  <span class="min-w-0 flex-1 truncate">{@render children()}</span>
{/snippet}

{#if href !== undefined}
  <a href={safeHref(href)} {target} {rel} class="{ROW} {klass}">{@render body()}</a>
{:else}
  <button
    {type}
    disabled={loading}
    aria-busy={loading || undefined}
    class="{ROW} disabled:cursor-progress {klass}">{@render body()}</button
  >
{/if}
