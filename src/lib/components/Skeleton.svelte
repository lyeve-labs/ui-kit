<script lang="ts">
  interface Props {
    /** Any CSS length. Match the content it stands in for, so nothing moves when it arrives. */
    width?: string;
    /** Any CSS length. */
    height?: string;
    /** A Tailwind rounding class. */
    rounded?: string;
    class?: string;
  }
  let {
    width = '100%',
    height = '1rem',
    rounded = 'rounded-md',
    class: klass = '',
  }: Props = $props();
</script>

<div
  class="animate-pulse bg-surface-2 {rounded} {klass}"
  style="width: {width}; height: {height};"
  aria-hidden="true"
></div>
