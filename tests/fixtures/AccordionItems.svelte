<script lang="ts">
  /* Two questions in one accordion, the way a block draws a list of them. */
  import Accordion from '../../src/lib/components/Accordion.svelte';
  import AccordionItem from '../../src/lib/components/AccordionItem.svelte';

  let { multiple = false }: { multiple?: boolean } = $props();
</script>

<Accordion {multiple}>
  <AccordionItem id="included" title="What is included?">Every block.</AccordionItem>
  <AccordionItem id="cancel" title="Can I cancel?">At any time.</AccordionItem>
</Accordion>
