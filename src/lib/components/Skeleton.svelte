<script lang="ts">
  interface Props {
    /** Any CSS length. Match the content it stands in for, so nothing moves when it arrives. */
    width?: string;
    /** Any CSS length. */
    height?: string;
    /** A Tailwind rounding class. */
    rounded?: string;
    /**
     * What the wait is for, such as "Loading webhooks", read to a screen reader
     * in place of the block. Give it to one skeleton of a group, not to each.
     */
    label?: string;
    class?: string;
  }
  let {
    width = '100%',
    height = '1rem',
    rounded = 'rounded-md',
    label,
    class: klass = '',
  }: Props = $props();
</script>

<!-- The block stays hidden, because a reader hears nothing from a shape. A
     label is read from a plain element rather than role="status": Orca reads
     nothing inside a status region. Each branch draws the block, so an
     unlabeled skeleton renders the one element it always has. -->
{#snippet block()}
  <div
    class="animate-pulse bg-surface-2 {rounded} {klass}"
    style="width: {width}; height: {height};"
    aria-hidden="true"
  ></div>
{/snippet}

{#if label}
  {@render block()}
  <span class="sr-only">{label}</span>
{:else}
  {@render block()}
{/if}
