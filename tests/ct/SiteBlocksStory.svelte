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
  import Section from '../../src/lib/components/Section.svelte';
  import Columns from '../../src/lib/components/Columns.svelte';
  import Prose from '../../src/lib/components/Prose.svelte';
  import Image from '../../src/lib/components/Image.svelte';
  import Quote from '../../src/lib/components/Quote.svelte';
  import NavBar from '../../src/lib/components/NavBar.svelte';
  import Footer from '../../src/lib/components/Footer.svelte';
  import Gallery from '../../src/lib/components/Gallery.svelte';

  // A picture that needs no network: four by three, one flat color.
  const picture =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23808080'/%3E%3C/svg%3E";
</script>

<SectionHeading>Plans</SectionHeading>
<SectionHeading level={3} variant="eyebrow">Pricing</SectionHeading>
<Card
  title="Starter"
  description="For a first site."
  image={{ src: picture, alt: '', width: 400, height: 300 }}
>
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
<Badge tone="violet"><svg width="12" height="12" aria-hidden="true"></svg>With an icon</Badge>
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
<Section label="Welcome" image={{ src: picture }} overlay="dark" height="tall">
  {#snippet intro()}
    <SectionHeading>Build a site</SectionHeading>
  {/snippet}
  <Prose>
    <p>Every page is <strong>yours</strong>. Read <a href="/guide">the guide</a> first.</p>
  </Prose>
  <Quote source="A designer">Done by noon.</Quote>
  {#snippet footer()}
    <Button href="/start">Start</Button>
  {/snippet}
</Section>
<Section overlay="light">
  <Prose><p>A light band.</p></Prose>
</Section>
<Columns max={3}>
  <Prose><p>One</p></Prose>
  <Prose><p>Two</p></Prose>
  <Prose><p>Three</p></Prose>
  <Prose><p>Four</p></Prose>
</Columns>
<Columns>
  <p>Left</p>
  <p>Right</p>
</Columns>
<Prose>
  <h2>Plans</h2>
  <p>Pick the one that fits. Use <code>npm</code> or not.</p>
  <h3>Starter</h3>
  <ul>
    <li>One site</li>
    <li>Every block</li>
  </ul>
  <ol>
    <li>Choose</li>
    <li>Publish</li>
  </ol>
  <blockquote>Simple to start.</blockquote>
  <Button href="/plans">See plans</Button>
</Prose>
<Image src={picture} alt="A gray square" width={400} height={300} caption="The first draft." />
<Image src={picture} alt="" ratio="3/2" loading="eager" />
<Quote source="A reader">It took an afternoon.</Quote>
<NavBar
  brand="Northwind"
  logo={{ src: picture, alt: 'Northwind', width: 400, height: 300 }}
  links={[
    { label: 'Home', href: '/', current: true },
    { label: 'Work', href: '/work' },
    { label: 'About us', href: '/about' },
    { label: 'Journal', href: '/journal' },
    { label: 'Shop', href: '/shop' },
    { label: 'Soon' },
  ]}
  action={{ label: 'Contact', href: '/contact' }}
/>
<Gallery
  images={[
    { src: picture, alt: 'The studio', caption: 'The studio.' },
    { src: picture, alt: '' },
  ]}
/>
<Gallery
  layout="row"
  images={[
    { src: picture, alt: 'A desk' },
    { src: picture, alt: 'A shelf' },
  ]}
/>
<Footer
  links={[{ label: 'Privacy', href: '/privacy' }, { label: 'Made in Lisbon' }]}
  social={[
    { network: 'github', href: 'https://github.com/example' },
    { network: 'mastodon', href: 'https://mastodon.social/@example' },
  ]}
>
  {#snippet note()}
    <p>Northwind Studio, <a href="/contact">write to us</a>.</p>
  {/snippet}
</Footer>
