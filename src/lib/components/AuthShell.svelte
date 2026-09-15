<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from './Card.svelte';
  import Logo from './Logo.svelte';

  type Width = 'md' | 'lg';

  interface Props {
    /** The one heading on the page. A sign-in swaps it for the second-factor step. */
    title: string;
    description?: string;
    /** Where the lockup links. Left unset, it is a mark and not a link. */
    href?: string;
    /** `md` is a form; `lg` is a walkthrough with more than one column. */
    width?: Width;
    /** Controls at the top end of the column: a theme toggle, a language switch. */
    actions?: Snippet;
    /** Under the card: the one link that leads off the page, such as "Create an account". */
    footer?: Snippet;
    children: Snippet;
  }

  let {
    title,
    description = undefined,
    href = undefined,
    width = 'md',
    actions = undefined,
    footer = undefined,
    children,
  }: Props = $props();

  const widths: Record<Width, string> = { md: 'max-w-md', lg: 'max-w-3xl' };
</script>

<!--
  The frame for a page the app shell does not wrap: sign in, sign up, a
  password reset, an invitation, first-run setup. PageShell is the wrong
  frame for these: they carry the product name, not a page title, and there
  is no navigation to sit beside. Every console hand-wrote this main, column,
  lockup, heading and card, and no two agreed: three heading sizes, a lockup
  on some pages, a theme control on others, and one class that named no
  token at all. Stated once here, the way AppShell states the signed-in frame.
-->
<main class="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
  <div class="w-full {widths[width]}">
    {#if actions}
      <div class="mb-4 flex justify-end">{@render actions()}</div>
    {/if}

    <div class="mb-8 text-center">
      {#if href}
        <a
          {href}
          class="mb-5 inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Logo size="lg" />
        </a>
      {:else}
        <Logo size="lg" class="mb-5" />
      {/if}
      <h1 class="text-2xl font-bold text-fg">{title}</h1>
      {#if description}
        <p class="mt-2 text-muted">{description}</p>
      {/if}
    </div>

    <Card pad="lg">
      {@render children()}
    </Card>

    {#if footer}
      <p class="mt-6 text-center text-sm text-muted">{@render footer()}</p>
    {/if}
  </div>
</main>
