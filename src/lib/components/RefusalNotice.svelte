<script lang="ts">
  import Alert from './Alert.svelte';
  import Button from './Button.svelte';
  import { isExternalHref } from '../internal/href.js';

  /**
   * A write the server refused, said the same way on every page: a title, the
   * sentence that says why, the way forward when there is one, and a link that
   * is always offered, such as the page where the setting is read. The page
   * passes every word, so a lifted limit never reads as a stale one here.
   */
  interface NoticeLink {
    href: string;
    label: string;
  }

  interface Props {
    title: string;
    body: string;
    /** Where the reader gets past the refusal, when the refusal names a place. */
    forward?: NoticeLink | null;
    /** The link offered on every refusal. */
    link: NoticeLink;
    /**
     * True where the way forward is the one action on its surface. A surface
     * holds one primary, and the notice usually sits in a drawer or a page that
     * has its own Create or Save, so by default its links stay below that: the
     * way forward secondary and the other link ghost.
     */
    lead?: boolean;
    class?: string;
  }

  let { title, body, forward = null, link, lead = false, class: klass = '' }: Props = $props();

  // A link to another origin opens in a tab of its own, so the page it opens
  // cannot reach back into this one through window.opener.
  const away = $derived(forward !== null && isExternalHref(forward.href));
</script>

<div class={klass} data-testid="refusal-notice">
  <Alert tone="warn" {title}>
    <p>{body}</p>
    <div class="mt-3 flex flex-wrap gap-2">
      {#if forward}
        <Button
          variant={lead ? 'primary' : 'secondary'}
          size="sm"
          href={forward.href}
          target={away ? '_blank' : undefined}
          rel={away ? 'noopener noreferrer' : undefined}
        >
          {forward.label}
        </Button>
      {/if}
      <Button variant={forward && !lead ? 'ghost' : 'secondary'} size="sm" href={link.href}>
        {link.label}
      </Button>
    </div>
  </Alert>
</div>
