<script lang="ts">
  interface Props {
    width?: string;
    height?: string;
    rounded?: string;
    class?: string;
  }
  let { width = '100%', height = '1rem', rounded = 'rounded-md', class: klass = '' }: Props = $props();
</script>

<div
  class="animate-pulse bg-surface-2 {rounded} {klass}"
  style="width: {width}; height: {height};"
  aria-hidden="true"
></div>
