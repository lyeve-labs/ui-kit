<script lang="ts" module>
  /** One difference between two versions, named by the field it is in. */
  export type DiffChange =
    | { kind: 'added'; label: string; value: string }
    | { kind: 'removed'; label: string; value: string }
    | { kind: 'changed'; label: string; before: string; after: string }
    | {
        kind: 'moved';
        label: string;
        /** Where it moved, in the caller's words, such as "From position 2 to 4". */
        value: string;
      };
</script>

<script lang="ts">
  /**
   * What changed between two versions, one row per field.
   *
   * Each row names its field and says what happened to it in a word: Added,
   * Removed, Changed or Moved, so the kind of change never rests on color. A
   * changed field shows the old value marked Removed above the new one marked
   * Added. Every value takes its direction from its own text, and a value
   * past 400 characters shows its start with a Show all button, cut between
   * two characters a reader sees as whole, so an emoji or an accent is never
   * split.
   *
   * The kit draws the list. Working out what changed is the caller's.
   */
  import { cn } from '../utils/cn.js';
  import type { AccentTone } from '../internal/tone.js';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';

  interface Props {
    changes: DiffChange[];
    class?: string;
  }

  let { changes, class: klass = '' }: Props = $props();

  /** How many characters of a value show before Show all. */
  const CLAMP = 400;

  const KIND: Record<DiffChange['kind'], { word: string; tone: AccentTone }> = {
    added: { word: 'Added', tone: 'success' },
    removed: { word: 'Removed', tone: 'danger' },
    changed: { word: 'Changed', tone: 'warn' },
    moved: { word: 'Moved', tone: 'brand' },
  };

  /**
   * The values a reader opened past the clamp, by row and side, and the
   * changes they were opened in. Other changes start folded, because a row's
   * position there names another value.
   */
  let opened = $state.raw<{ changes: DiffChange[]; keys: Set<string> } | null>(null);

  function isOpen(key: string): boolean {
    return opened?.changes === changes && opened.keys.has(key);
  }

  function toggle(key: string) {
    const keys = new Set(opened?.changes === changes ? opened.keys : []);
    if (!keys.delete(key)) keys.add(key);
    opened = { changes, keys };
  }

  /**
   * The first CLAMP characters a reader sees as whole, or null when the text
   * is no longer than that. A string no longer in code units than the clamp
   * cannot hold more characters, so only a long one is segmented.
   */
  function clip(text: string): string | null {
    if (text.length <= CLAMP) return null;
    let seen = 0;
    for (const { index } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
      text,
    )) {
      if (seen === CLAMP) return text.slice(0, index);
      seen++;
    }
    return null;
  }
</script>

<!-- `what` names the value in its button, so a list of buttons tells each
     Show all apart. -->
{#snippet shown(key: string, text: string, tint: string, what: string)}
  {@const head = clip(text)}
  {@const full = isOpen(key)}
  <div class="min-w-0">
    {#if text === ''}
      <p class="text-faint italic">Empty</p>
    {:else}
      <p
        dir="auto"
        class={cn(
          'rounded-md whitespace-pre-wrap text-fg [overflow-wrap:anywhere]',
          tint && `px-2 py-1 ${tint}`,
        )}
      >
        {head === null || full ? text : head}
      </p>
      {#if head !== null}
        <Button
          variant="ghost"
          size="sm"
          class="mt-1"
          aria-label="{full ? 'Show less' : 'Show all'} of {what}"
          aria-expanded={full}
          onclick={() => toggle(key)}
        >
          {full ? 'Show less' : 'Show all'}
        </Button>
      {/if}
    {/if}
  </div>
{/snippet}

<div class={cn('text-sm', klass)}>
  {#if changes.length === 0}
    <p class="text-muted">These versions are the same.</p>
  {:else}
    <ul class="divide-y divide-line">
      {#each changes as change, i (i)}
        <li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
          <div class="flex flex-wrap items-center gap-2">
            <span dir="auto" class="min-w-0 font-medium text-fg [overflow-wrap:anywhere]">
              {change.label}
            </span>
            <Badge tone={KIND[change.kind].tone}>{KIND[change.kind].word}</Badge>
          </div>
          {#if change.kind === 'changed'}
            <div class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
              <span class="text-xs font-medium text-muted">Removed</span>
              {@render shown(
                `${i}-before`,
                change.before,
                'bg-danger/10',
                `${change.label}, removed`,
              )}
              <span class="text-xs font-medium text-muted">Added</span>
              {@render shown(`${i}-after`, change.after, 'bg-success/10', `${change.label}, added`)}
            </div>
          {:else}
            {@render shown(`${i}`, change.value, '', change.label)}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
