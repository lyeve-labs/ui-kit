<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    striped?: boolean;
    hoverable?: boolean;
    fixed?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    striped = false,
    hoverable = true,
    fixed = false,
    class: cls = '',
    children,
  }: Props = $props();
</script>

<div class="w-full overflow-x-auto rounded-xl border border-line {cls}">
  <table
    class="w-full text-sm text-left
      {fixed ? 'table-fixed' : ''}
      [&_thead_tr]:border-b [&_thead_tr]:border-line [&_thead]:bg-surface-2/40
      [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:text-xs
        [&_thead_th]:font-medium [&_thead_th]:text-faint
        [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:whitespace-nowrap
      [&_tbody_td]:px-4 [&_tbody_td]:py-3 [&_tbody_td]:text-fg [&_tbody_td]:align-middle
      [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr:last-child]:border-0
      {striped ? '[&_tbody_tr:nth-child(even)]:bg-surface-2/40' : ''}
      {hoverable
      ? '[&_tbody_tr:hover]:bg-surface-2/60 [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150'
      : ''}"
  >
    {@render children()}
  </table>
</div>
