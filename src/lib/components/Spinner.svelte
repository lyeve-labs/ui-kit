<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
  }
  let { size = 16, class: klass = '' }: Props = $props();
</script>

<svg
  class="animate-spin shrink-0 {klass}"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25" />
  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
</svg>
