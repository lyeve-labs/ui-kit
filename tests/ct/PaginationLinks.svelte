<script lang="ts">
  // A function prop from a spec reaches the page as a callback into Node, which
  // answers with a promise. The link builder has to answer at once, so it is
  // written here.
  import Pagination from '../../src/lib/components/Pagination.svelte';

  let { page, hasNext }: { page: number; hasNext: boolean } = $props();
</script>

<Pagination {page} {hasNext} href={(p: number) => `?page=${p}`} />
