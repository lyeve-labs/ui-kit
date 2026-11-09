<script lang="ts">
  /**
   * A set of disclosures. Each item is a `details` element, so the browser
   * opens and closes it and a page rendered on the server needs no script.
   * Unless `multiple` is set the items share one `name`, and opening one
   * closes the others. A browser too old for a shared name lets several stay
   * open. The name counts from the start of each server render, so a page put
   * together from several renders gives each its own `idPrefix`, or two
   * accordions on it share a name.
   */
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    /** Lets more than one item stay open. By default opening one closes the others. */
    multiple?: boolean;
    /** Drops the outer border and rounding, for an accordion inside a card or panel. */
    flush?: boolean;
    class?: string;
    children: Snippet;
  }

  let { multiple = false, flush = false, class: cls = '', children }: Props = $props();

  // $props.id() and not a random string: a random id differs between the server
  // render and hydration, and the items would then lose their shared name.
  const uid = $props.id();

  setContext<{ readonly name: string | undefined }>('accordion', {
    get name() {
      return multiple ? undefined : `accordion-${uid}`;
    },
  });
</script>

<div
  class="{flush
    ? 'divide-y divide-line'
    : 'divide-y divide-line rounded-xl border border-line overflow-hidden'} {cls}"
>
  {@render children()}
</div>
