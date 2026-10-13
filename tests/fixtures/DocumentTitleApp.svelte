<script lang="ts">
  /*
   * An app's root layout reduced to the call under test, with one page under
   * it. The format is stated once, above the page, and the page's PageShell is
   * what reads it.
   */
  import { PageShell, setDocumentTitleFormat } from '../../src/lib/index.js';

  interface Props {
    title: string;
    documentTitle?: string;
  }

  let { title, documentTitle = undefined }: Props = $props();

  setDocumentTitleFormat((page) => `${page} | Acme`);
</script>

<PageShell {title} {documentTitle}>
  <p>Body</p>
</PageShell>
