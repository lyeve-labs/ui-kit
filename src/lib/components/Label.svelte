<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    for: htmlFor,
    required = false,
    hint,
    class: cls = '',
    children,
  }: {
    for?: string;
    /**
     * Draws the marker beside the text. Set `required` on the control this
     * label points at as well: the marker is decorative, and the control's own
     * attribute is what a screen reader reports. A label is read in full to
     * name what it points at, so anything said here lands in that name.
     */
    required?: boolean;
    hint?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<label
  for={htmlFor}
  class="flex items-center gap-1 text-xs font-medium text-muted uppercase tracking-wider {cls}"
>
  {@render children()}
  {#if required}
    <span class="text-danger font-bold leading-none" aria-hidden="true">*</span>
  {/if}
  {#if hint}
    <span class="text-faint normal-case font-normal ml-0.5">({hint})</span>
  {/if}
</label>
