<script lang="ts">
  /* An accordion inside an item of another, the outer one opened by the test. */
  import Accordion from '../../src/lib/components/Accordion.svelte';
  import AccordionItem from '../../src/lib/components/AccordionItem.svelte';
</script>

<Accordion>
  <AccordionItem id="plans" title="Plans">
    <Accordion flush>
      <AccordionItem id="starter" title="Starter">For a first site.</AccordionItem>
    </Accordion>
  </AccordionItem>
</Accordion>
