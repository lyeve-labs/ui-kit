<script lang="ts">
  import { safeHref } from '../internal/href.js';
  import { formatCount } from '../internal/number.js';

  interface Base {
    page: number;
    /**
     * Collection size, when the endpoint states one.
     *
     * Leave it out for a list whose endpoint reports no count and say `hasNext`
     * instead. Absent is not zero: a caller who does state a total, even a
     * nonsense one, gets the counted pager with that total clamped.
     */
    total?: number;
    perPage?: number;
    /**
     * Whether a page after this one exists.
     *
     * Read only when `total` is absent, because a counted list already knows
     * where it ends. It is the answer an endpoint can give without counting the
     * collection: ask for one row more than the page holds and see if it comes
     * back.
     */
    hasNext?: boolean;
    /**
     * What the list holds, in the plural: 'files', 'jobs', 'webhooks'.
     *
     * The summary names it, because a console that stacks three lists under one
     * page title prints '51 to 100' three times and says of what nowhere. Left
     * out, the summary reads exactly as it did before this existed.
     *
     * Plural at every size, including a list of one. The noun labels the
     * collection here rather than agreeing with a figure in the sentence, the
     * same way the column header above it does, and a singular form would have
     * to pick which of the three figures governs it.
     */
    noun?: string;
    class?: string;
  }

  /**
   * How the pager moves, and why it takes both spellings.
   *
   * `onchange` cannot run before the page hydrates, so a pager that has only a
   * callback is inert on the first paint and an early click lands on nothing.
   * That is not a rare state: it is every server-rendered document, for as long
   * as the bundle takes to arrive. A caller that has to page from that document
   * supplies `href` instead and gets links, which the browser follows with no
   * script at all.
   *
   * Exclusive rather than both together: an anchor whose click also ran the
   * callback would page twice, once through the handler and again through the
   * navigation it did not cancel.
   */
  type Nav =
    | { onchange: (page: number) => void; href?: undefined }
    | { href: (page: number) => string; onchange?: undefined };

  let {
    page,
    total = undefined,
    perPage = 20,
    hasNext = false,
    noun = '',
    class: cls = '',
    onchange,
    href,
  }: Base & Nav = $props();

  /**
   * A stated total is what makes the numbered pages knowable. Without one the
   * pager can offer the step either side of where it stands and nothing more,
   * because the last page is not a number anybody here has.
   */
  let counted = $derived(total !== undefined);
  let safeTotal = $derived(typeof total === 'number' && isFinite(total) && total >= 0 ? total : 0);
  let safePage = $derived(isFinite(page) && page >= 1 ? page : 1);
  let totalPages = $derived(Math.max(1, Math.ceil(safeTotal / perPage)));
  let from = $derived(Math.min((safePage - 1) * perPage + 1, safeTotal));
  let to = $derived(Math.min(safePage * perPage, safeTotal));

  let canPrev = $derived(safePage > 1);
  let canNext = $derived(counted ? safePage < totalPages : hasNext);
  let hasControls = $derived(counted ? totalPages > 1 : canPrev || canNext);

  /**
   * The elided run is the sentinel string 'gap', never the horizontal-ellipsis
   * character.
   *
   * The glyph used to be both the value here and the text of the span that
   * rendered it, and that span carried no aria-hidden, so a screen reader read
   * "horizontal ellipsis" aloud between two page numbers. The gap is decoration:
   * it says nothing the page numbers either side do not already say.
   */
  type PageSlot = number | 'gap';

  function pageNumbers(current: number, last: number): PageSlot[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages: PageSlot[] = [1];
    if (current > 3) pages.push('gap');
    for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < last - 2) pages.push('gap');
    pages.push(last);
    return pages;
  }

  /**
   * A page number is unique in the list, so it is its own key. Both gaps are
   * spelled 'gap', so they take their position as well. Keying on the index
   * alone made every slot change identity when a page was inserted ahead of it.
   */
  function slotKey(slot: PageSlot, index: number): string {
    return slot === 'gap' ? `gap-${index}` : `page-${slot}`;
  }

  let nums = $derived(counted ? pageNumbers(safePage, totalPages) : []);

  /**
   * The noun as it will be read.
   *
   * Trimmed, and empty means absent: a caller composing the word from data can
   * hand over ' ' as easily as 'files', and a summary that opens with a stray
   * space is worse than one that names nothing.
   */
  let label = $derived(noun.trim());

  /**
   * The count, when there is one to state.
   *
   * An uncounted list says which page it is on and nothing else. It cannot say
   * "1 to 20 of 400" without the total, and it cannot say "1 to 20" either: the
   * last page is short and this component is never told how short. It still
   * groups the page number: `href` mode puts that number in the URL, so a link
   * or a reader can land on page 5,000 without stepping there.
   *
   * Every figure is grouped, because a pager sits under a table that groups its
   * own figures and the pager is where the largest number on the screen is.
   */
  let summary = $derived.by(() => {
    if (!counted) {
      return label ? `${label}, page ${formatCount(safePage)}` : `Page ${formatCount(safePage)}`;
    }
    if (safeTotal === 0) return label ? `No ${label}` : 'No results';
    const range = `${formatCount(from)} to ${formatCount(to)} of ${formatCount(safeTotal)}`;
    return label ? `${label} ${range}` : range;
  });

  /** The target of a control, sanitized, or nothing when the step is unavailable. */
  function linkTo(target: number, enabled: boolean): string | undefined {
    return href && enabled ? safeHref(href(target)) : undefined;
  }

  const btnBase =
    'inline-flex items-center justify-center w-7 h-7 rounded text-xs font-medium transition-colors duration-150';

  /**
   * A page control that is not the page you are on, in every state a pointer
   * can put it in.
   *
   * Held as well as hovered, because `hover:` never matches on a touch screen
   * and paging is a thumb gesture: without the pressed step a tap on a phone
   * changed the page with nothing on the control to say it had been hit.
   *
   * Stated once rather than spelled out on the previous button, the next button
   * and every numbered one. It was written three times, and a state added to
   * one copy is a state missing from two.
   */
  const btnRest = 'text-muted hover:text-fg hover:bg-surface-2 active:bg-line active:text-fg';

  const btnCurrent = 'bg-brand text-ink';

  /**
   * A link with nowhere to go.
   *
   * An anchor has no `disabled`, and `disabled:` never matches one, so the two
   * states have to be painted rather than declared. Dropping the href is what
   * takes it out of the tab order and stops activation; the class is only the
   * part a reader can see, at the same 30% the disabled buttons use.
   */
  const linkInert = 'pointer-events-none opacity-30';
</script>

{#snippet arrow(d: string)}
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="rtl:rotate-180"
  >
    <path {d} />
  </svg>
{/snippet}

<!-- Previous and next, as a link when the caller builds hrefs and as a button
     when it hands over a callback. The two branches carry the same classes and
     the same label, so the pager reads and sounds the same either way. -->
{#snippet step(target: number, label: string, enabled: boolean, d: string)}
  {#if href}
    <a
      href={linkTo(target, enabled)}
      aria-label={label}
      aria-disabled={enabled ? undefined : 'true'}
      class="{btnBase} {btnRest} {enabled ? '' : linkInert}"
    >
      {@render arrow(d)}
    </a>
  {:else}
    <button
      type="button"
      disabled={!enabled}
      onclick={() => onchange?.(target)}
      aria-label={label}
      class="{btnBase} {btnRest} disabled:cursor-not-allowed disabled:opacity-30"
    >
      {@render arrow(d)}
    </button>
  {/if}
{/snippet}

<!-- The summary renders whenever there is a count to state, and the page
     buttons only when there is more than one page. The whole component used to
     be behind `totalPages > 1`, and an empty list has one page, so the 'No
     results' line below could never appear and a single page of results showed
     no count at all. -->
<div class="flex flex-wrap items-center gap-x-3 gap-y-2 {cls}">
  <span class="shrink-0 text-xs text-faint">{summary}</span>

  {#if hasControls}
    <div class="ms-auto flex flex-wrap items-center gap-0.5">
      {@render step(safePage - 1, 'Previous page', canPrev, 'M15 18l-6-6 6-6')}

      {#each nums as n, i (slotKey(n, i))}
        {#if n === 'gap'}
          <!-- Three drawn dots, not the ellipsis character: a font glyph lands
               at a different optical weight from every other icon here, and the
               character is what the screen reader was speaking. -->
          <span class="inline-flex w-7 items-center justify-center text-faint" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h.01M12 12h.01M19 12h.01" />
            </svg>
          </span>
        {:else if href}
          <a
            href={linkTo(n, true)}
            aria-current={safePage === n ? 'page' : undefined}
            class="{btnBase} {safePage === n ? btnCurrent : btnRest}"
          >
            {n}
          </a>
        {:else}
          <button
            type="button"
            onclick={() => onchange?.(n as number)}
            aria-current={safePage === n ? 'page' : undefined}
            class="{btnBase} {safePage === n ? btnCurrent : btnRest}"
          >
            {n}
          </button>
        {/if}
      {/each}

      {@render step(safePage + 1, 'Next page', canNext, 'M9 18l6-6-6-6')}
    </div>
  {/if}
</div>
