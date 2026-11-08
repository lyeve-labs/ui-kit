<script lang="ts">
  // Each component a page block draws with, in more than one state, and no
  // class of the story's own, so every rule on the page comes from the kit.
  import Accordion from '../../src/lib/components/Accordion.svelte';
  import AccordionItem from '../../src/lib/components/AccordionItem.svelte';
  import Badge from '../../src/lib/components/Badge.svelte';
  import Button from '../../src/lib/components/Button.svelte';
  import Card from '../../src/lib/components/Card.svelte';
  import Checkbox from '../../src/lib/components/Checkbox.svelte';
  import Field from '../../src/lib/components/Field.svelte';
  import FormMessage from '../../src/lib/components/FormMessage.svelte';
  import Input from '../../src/lib/components/Input.svelte';
  import Label from '../../src/lib/components/Label.svelte';
  import SectionHeading from '../../src/lib/components/SectionHeading.svelte';
  import Textarea from '../../src/lib/components/Textarea.svelte';
</script>

<SectionHeading>Plans</SectionHeading>
<SectionHeading level={3} variant="eyebrow">Pricing</SectionHeading>
<Card title="Starter" description="For a first site.">
  <p>Everything a small site needs.</p>
  {#snippet footer()}
    <Button href="/start">Start</Button>
  {/snippet}
</Card>
<Button variant="secondary">Compare</Button>
<Button variant="ghost" size="sm">Details</Button>
<Button variant="outline" size="lg" disabled>Sold out</Button>
<Badge tone="success">New</Badge>
<Badge tone="brand" size="sm" dot>Popular</Badge>
<Accordion>
  <AccordionItem id="included" title="What is included?">Every block.</AccordionItem>
  <AccordionItem id="cancel" title="Can I cancel?">At any time.</AccordionItem>
</Accordion>
<Field label="Plan" hint="You can change it later.">
  {#snippet children({ id })}
    <span {id}>Starter</span>
  {/snippet}
</Field>
<Label for="company" required>Company</Label>
<Input label="Email" type="email" error="Enter an email address." />
<Textarea label="Message" hint="Up to 500 characters." />
<Checkbox label="Send me updates" checked />
<FormMessage tone="success">Message sent.</FormMessage>
<FormMessage tone="danger">Could not send the message. Try again.</FormMessage>
