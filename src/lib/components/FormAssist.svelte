<script lang="ts">
  /**
   * Lets an assistant elsewhere on the page read this form and suggest a value
   * for each field, through the kit's controls inside it.
   *
   * The controls register through `assistField`. A suggested value goes into
   * the control, so the person sees the real change, and the page's own Save
   * or Create posts it. While any suggestion is pending the enclosing form
   * refuses to submit, so nothing a person has not reviewed is ever posted.
   */
  import { tick, type Snippet } from 'svelte';
  import { Sparkles } from '@lucide/svelte';
  import Button from './Button.svelte';
  import {
    heldSentence,
    provideAssistForm,
    registerAssistForm,
    suggestsSentence,
  } from '../internal/assist.svelte.js';

  interface Props {
    /** Names the form for whoever fills it, such as "New key". */
    label: string;
    class?: string;
    children: Snippet;
  }

  let { label, class: klass = 'flex flex-col gap-4', children }: Props = $props();

  const form = provideAssistForm(() => label);

  let root: HTMLDivElement | undefined = $state();
  let bar: HTMLDivElement | undefined = $state();

  const count = $derived(form.count);

  // Listed for the page only once mounted. A module-level list filled during a
  // server render would be shared by every request the server handles.
  $effect(() => {
    if (!root) return;
    const element = root;
    return registerAssistForm({ controller: form.controller, element });
  });

  // Capture on the window runs before any listener on the form itself, so a
  // held submit never reaches use:enhance or the page's own onsubmit. Only
  // the form around this one counts: a form nested inside posts something else.
  $effect(() => {
    if (!root) return;
    const element: HTMLDivElement = root;
    const encloses = (target: EventTarget | null) =>
      target instanceof HTMLFormElement && target.contains(element);
    function hold(event: SubmitEvent) {
      if (!encloses(event.target) || form.count === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      form.hold();
      void tick().then(() => bar?.focus());
    }
    // use:enhance resets the form after a save, and the values it puts back
    // are no longer the person's edits.
    function reset(event: Event) {
      if (encloses(event.target)) form.reset();
    }
    window.addEventListener('submit', hold, true);
    window.addEventListener('reset', reset, true);
    return () => {
      window.removeEventListener('submit', hold, true);
      window.removeEventListener('reset', reset, true);
    };
  });
</script>

<div bind:this={root} class={klass}>
  <div class="sr-only" aria-live="polite">{form.announcement}</div>
  {#if count > 0}
    <div
      bind:this={bar}
      tabindex="-1"
      class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-violet/45 bg-violet/8 py-2 ps-3 pe-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Sparkles size={16} class="shrink-0 text-violet" aria-hidden="true" />
      <p class="min-w-0 flex-1">{form.held ? heldSentence(count) : suggestsSentence(count)}</p>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" onclick={() => form.rejectAll()}>Reject all</Button>
        <Button variant="secondary" size="sm" onclick={() => form.acceptAll()}>Accept all</Button>
      </div>
    </div>
  {/if}
  {@render children()}
</div>
