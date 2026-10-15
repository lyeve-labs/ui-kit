<script lang="ts">
  import type { Snippet } from 'svelte';
  import { HIT_AREA } from '../internal/touch.js';
  import { cn } from '../utils/cn.js';
  import Card from './Card.svelte';
  import Logo from './Logo.svelte';

  type Width = 'md' | 'lg';

  interface Props {
    /** The one heading on the page. A sign-in swaps it for the second-factor step. */
    title: string;
    description?: string;
    /** Where the lockup links. Left unset, it is a mark and not a link. */
    href?: string;
    /** `md` is a form. `lg` is a walkthrough with more than one column. */
    width?: Width;
    /**
     * Drawn above the heading in place of the product mark, such as a
     * tenant's logo and name. Inside the `href` link it names that link, so
     * it carries words or an image with alt text.
     */
    lockup?: Snippet;
    /** Controls at the top end of the column: a theme toggle, a language switch. */
    actions?: Snippet;
    /** Under the card: the one link that leads off the page, such as "Create an account". */
    footer?: Snippet;
    /** Added to the page's outer element. */
    class?: string;
    /**
     * Set on the page's outer element, so custom properties scope to the
     * page: a tenant's accent repaints the brand tokens for everything inside.
     */
    style?: string;
    children: Snippet;
  }

  let {
    title,
    description = undefined,
    href = undefined,
    width = 'md',
    lockup = undefined,
    actions = undefined,
    footer = undefined,
    class: klass = '',
    style = undefined,
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
<main class={cn('flex min-h-screen items-center justify-center bg-ink px-4 py-10', klass)} {style}>
  <div class="w-full {widths[width]}">
    {#if actions}
      <div class="mb-4 flex justify-end">{@render actions()}</div>
    {/if}

    <div class="mb-8 text-center">
      {#if href}
        <!-- The lockup is 36px tall. Under a finger the link takes a 44px
             hit box around it rather than growing, so a mouse sees the
             heading where it was. -->
        <a
          {href}
          class="{HIT_AREA} mb-5 inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {#if lockup}
            {@render lockup()}
          {:else}
            <Logo size="lg" />
          {/if}
        </a>
      {:else if lockup}
        <div class="mb-5 flex justify-center">{@render lockup()}</div>
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
