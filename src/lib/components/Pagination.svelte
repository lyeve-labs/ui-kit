<script lang="ts">
  let {
    page,
    total,
    perPage = 20,
    class: cls = '',
    onchange,
  }: {
    page: number;
    total: number;
    perPage?: number;
    class?: string;
    onchange: (page: number) => void;
  } = $props();

  let totalPages = $derived(Math.max(1, Math.ceil(total / perPage)));
  let from = $derived(Math.min((page - 1) * perPage + 1, total));
  let to = $derived(Math.min(page * perPage, total));

  function pageNumbers(current: number, last: number): (number | '…')[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < last - 2) pages.push('…');
    pages.push(last);
    return pages;
  }

  let nums = $derived(pageNumbers(page, totalPages));

  const btnBase =
    'inline-flex items-center justify-center w-7 h-7 rounded text-xs font-medium transition-colors';
</script>

{#if totalPages > 1}
  <div class="flex items-center gap-3 {cls}">
    <span class="text-xs text-faint shrink-0">
      {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
    </span>

    <div class="flex items-center gap-0.5 ml-auto">
      <button
        type="button"
        disabled={page <= 1}
        onclick={() => onchange(page - 1)}
        aria-label="Previous page"
        class="{btnBase} text-muted hover:text-fg hover:bg-surface-2
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {#each nums as n, i (i)}
        {#if n === '…'}
          <span class="w-7 text-center text-xs text-faint">…</span>
        {:else}
          <button
            type="button"
            onclick={() => onchange(n as number)}
            aria-current={page === n ? 'page' : undefined}
            class="{btnBase}
              {page === n ? 'bg-brand text-ink' : 'text-muted hover:text-fg hover:bg-surface-2'}"
          >
            {n}
          </button>
        {/if}
      {/each}

      <button
        type="button"
        disabled={page >= totalPages}
        onclick={() => onchange(page + 1)}
        aria-label="Next page"
        class="{btnBase} text-muted hover:text-fg hover:bg-surface-2
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  </div>
{/if}
