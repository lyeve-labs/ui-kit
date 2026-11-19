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

<!-- A label is read from a plain element rather than role="status": Orca reads
     nothing inside a status region. The words sit inside the block, so a
     labeled skeleton is still one element and takes the margin or border a
     space-y or divide-y stack gives its children. A wrapper with
     display: contents would be one node too, but a stack's margin and border
     land on that wrapper, which draws no box. Without a label the block is
     hidden, because a reader hears nothing from a shape. -->
{#if label}
  <div
    class="animate-pulse bg-surface-2 {rounded} {klass}"
    style="width: {width}; height: {height};"
  >
    <span class="sr-only">{label}</span>
  </div>
{:else}
  <div
    class="animate-pulse bg-surface-2 {rounded} {klass}"
    style="width: {width}; height: {height};"
    aria-hidden="true"
  ></div>
{/if}
