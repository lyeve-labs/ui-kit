<script lang="ts" module>
  /** A link in a navigation bar. With no `href` the label is drawn as text. */
  export interface NavLink {
    label: string;
    href?: string;
    /** The page the bar is drawn on, announced as the current page. */
    current?: boolean;
  }
</script>

<script lang="ts">
  /**
   * A site's navigation: its name or logo, its links and one call to action.
   * The links wrap onto more lines as the page narrows, so every one stays in
   * reach on a phone without a menu that needs script.
   */
  import Button from './Button.svelte';

  interface Props {
    /** The site's name, drawn beside the logo. */
    brand?: string;
    /** Drawn 32px tall. Its width and height reserve its box. */
    logo?: { src: string; alt: string; width: number; height: number };
    links?: NavLink[];
    /** The one button at the end of the bar. */
    action?: { label: string; href: string };
    /** The landmark's name for a screen reader. */
    label?: string;
    class?: string;
  }

  let {
    brand = undefined,
    logo = undefined,
    links = [],
    action = undefined,
    label = 'Main',
    class: klass = '',
  }: Props = $props();

  // The name beside a logo already says what the logo shows.
  const logoAlt = $derived(brand ? '' : (logo?.alt ?? ''));
</script>

<nav aria-label={label} class="flex flex-wrap items-center gap-x-site-md gap-y-site-sm {klass}">
  {#if brand || logo}
    <span
      class="me-auto inline-flex items-center gap-site-sm font-heading text-xl font-bold text-fg"
    >
      {#if logo}
        <img
          class="h-8 w-auto"
          src={logo.src}
          alt={logoAlt}
          width={logo.width}
          height={logo.height}
          decoding="async"
        />
      {/if}
      {brand ?? ''}
    </span>
  {/if}
  {#if links.length > 0}
    <ul class="m-0 flex list-none flex-wrap gap-x-site-md gap-y-site-xs p-0">
      {#each links as link, i (i)}
        <li class="shrink-0">
          {#if link.href}
            <a
              href={link.href}
              aria-current={link.current ? 'page' : undefined}
              class="text-fg no-underline underline-offset-4 transition-colors hover:text-brand hover:underline aria-[current=page]:text-brand aria-[current=page]:underline"
              >{link.label}</a
            >
          {:else}
            <span class="text-fg">{link.label}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if action}
    <Button href={action.href}>{action.label}</Button>
  {/if}
</nav>
