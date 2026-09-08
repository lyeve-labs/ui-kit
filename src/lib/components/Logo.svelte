<script lang="ts">
  /**
   * The product mark, and the wordmark beside it.
   *
   * Two applications each carried their own copy of this lockup and the two had
   * drifted: different box sizes, different wordmark weights, and one of them
   * painting the mark from hex behind a prefers-color-scheme query. That query
   * asks the operating system, while the apps theme off `data-theme` on the
   * html element, so the two disagreed for anyone who chose a theme their
   * desktop was not already set to: a light desktop with the app in dark mode
   * drew a near-black column on a dark surface. There is no media query here
   * for that reason, and none belongs here.
   *
   * The neutral faces come from currentColor and the lit faces from the brand
   * ramp, so every face answers the same tokens as the rest of the page and a
   * palette change reaches the mark with everything else.
   */

  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    /**
     * Named rather than a pixel count. The two copies this replaces shipped at
     * 28px and 36px with different wordmark weights, and a free number is how
     * the third one drifts too.
     */
    size?: Size;
    /**
     * False renders the mark alone, for a slot too narrow to carry the name.
     * The mark is decoration and is hidden from a screen reader either way, so
     * a link holding only the mark has to carry its own name.
     */
    wordmark?: boolean;
    class?: string;
  }

  let { size = 'md', wordmark = true, class: klass = '' }: Props = $props();

  /*
   * The box is a width and a height attribute, not a utility class: the two
   * dimensions are a runtime value, and a class assembled from one matches no
   * candidate in Tailwind's scan and silently does nothing.
   */
  const marks: Record<Size, number> = { sm: 24, md: 28, lg: 36 };
  const words: Record<Size, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

  const px = $derived(marks[size]);
</script>

<!-- text-fg is stated here rather than inherited. The mark is usually wrapped
     in a link that carries no colour of its own, so currentColor would
     otherwise be whatever that ancestor happened to hold. -->
<span class="inline-flex items-center gap-2 text-fg {klass}">
  <span class="inline-flex shrink-0 items-center justify-center">
    <svg
      width={px}
      height={px}
      viewBox="0 0 72 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="translate(6 4)">
        <polygon class="fill-current" points="0,14 14,7 14,40 0,47" />
        <polygon class="fill-current opacity-50" points="0,47 14,40 14,54 0,61" />
        <polygon class="fill-current opacity-75" points="14,40 28,33 28,47 14,54" />
        <polygon class="fill-brand-light" points="14,54 28,47 56,33 42,40" />
        <polygon class="fill-brand-deep" points="42,40 56,33 56,47 42,54" />
        <polygon class="fill-brand" points="14,54 28,61 42,54 28,47" />
        <polygon class="fill-brand" points="28,47 42,54 56,47 42,40" />
      </g>
    </svg>
  </span>

  {#if wordmark}
    <span class="font-semibold tracking-tight {words[size]}">LyEve</span>
  {/if}
</span>
