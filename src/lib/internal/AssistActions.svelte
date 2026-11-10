<script lang="ts">
  /**
   * The accept and reject buttons on a field holding a suggestion.
   *
   * They sit in the label row rather than over it, so under a finger they grow
   * to the control height and push the row open instead of covering the
   * control below. Once a button acts it leaves the page, so focus moves to
   * the field it decided rather than falling back to the document.
   */
  import { Check, X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import type { AssistField } from './assist.svelte.js';
  import { TOUCH_GROW } from './touch.js';

  interface Props {
    field: AssistField;
    /**
     * The element that takes focus once a button acts. Without it, the first
     * control in the field around the buttons does.
     */
    focus?: () => HTMLElement | null | undefined;
  }

  let { field, focus = undefined }: Props = $props();

  const button =
    `${TOUCH_GROW} flex size-6.75 items-center justify-center rounded-md text-muted ` +
    'outline-none transition-colors hover:bg-surface-2 hover:text-fg ' +
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus';

  async function act(event: MouseEvent, run: () => void) {
    const wrap = (event.currentTarget as HTMLElement).closest('[data-field], [role="group"]');
    run();
    await tick();
    const target =
      focus?.() ??
      wrap?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea, button:not([disabled]), [tabindex="0"]',
      );
    target?.focus();
  }
</script>

<span class="ms-auto flex shrink-0 items-center gap-0.5">
  <button
    type="button"
    aria-label="Accept the suggestion for {field.label}"
    class={button}
    onclick={(e) => act(e, () => field.accept())}
  >
    <Check size={14} aria-hidden="true" />
  </button>
  <button
    type="button"
    aria-label="Reject the suggestion for {field.label}"
    class={button}
    onclick={(e) => act(e, () => field.reject())}
  >
    <X size={14} aria-hidden="true" />
  </button>
</span>
