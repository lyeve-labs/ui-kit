<script lang="ts" module>
  /** The networks a footer links a profile on, by the name each one uses. */
  export const SOCIAL_NETWORKS = {
    x: 'X',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
    mastodon: 'Mastodon',
  } as const;

  export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;
</script>

<script lang="ts">
  /**
   * The foot of a site: a note, a row of links and the site's profiles
   * elsewhere. A profile is a plain link named for its network, never a
   * network's script or embed, and `rel="me"` lets the network confirm the
   * site is the profile's owner.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    /** A short text, such as the address or the copyright. */
    note?: Snippet;
    /** With no `href` a label is drawn as text. */
    links?: { label: string; href?: string }[];
    social?: { network: SocialNetwork; href: string }[];
    /** The name of the links' landmark for a screen reader. */
    label?: string;
    /** The name of the list of profiles for a screen reader. */
    socialLabel?: string;
    class?: string;
  }

  let {
    note,
    links = [],
    social = [],
    label = 'Footer',
    socialLabel = 'Social',
    class: klass = '',
  }: Props = $props();

  const LINK = 'text-muted underline-offset-4 transition-colors hover:text-fg hover:underline';
  const ROW = 'm-0 flex list-none flex-wrap gap-x-site-md gap-y-site-xs p-0';
</script>

<footer class="grid gap-site-md border-t border-line pt-site-md text-sm text-muted {klass}">
  {#if note}
    <div class="[&_a:not([class])]:underline [&_p:not([class])+p]:mt-site-xs">{@render note()}</div>
  {/if}
  {#if links.length > 0}
    <nav aria-label={label}>
      <ul class={ROW}>
        {#each links as link, i (i)}
          <li class="shrink-0">
            {#if link.href}
              <a class={LINK} href={link.href}>{link.label}</a>
            {:else}
              <span>{link.label}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </nav>
  {/if}
  {#if social.length > 0}
    <!-- A list without its markers loses the list role in WebKit, and with it
         its name, so the role is stated. -->
    <!-- svelte-ignore a11y_no_redundant_roles -->
    <ul role="list" class={ROW} aria-label={socialLabel}>
      {#each social as profile, i (i)}
        <li class="shrink-0">
          <a class={LINK} href={profile.href} rel="me">{SOCIAL_NETWORKS[profile.network]}</a>
        </li>
      {/each}
    </ul>
  {/if}
</footer>
