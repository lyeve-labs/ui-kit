<script lang="ts">
  /**
   * A field's label with its required marker.
   *
   * The marker is decorative: it is hidden from assistive technology, and the
   * component that renders this states the requirement on its control, where a
   * screen reader reads it. A name is what a voice-control user speaks at the
   * control, and nobody says "Email star".
   */
  import type { Snippet } from 'svelte';
  import { FIELD_LABEL } from './field.js';

  interface Props {
    text: string;
    required?: boolean;
    /** The control the label names. Without it the label is a `span` or a `legend`. */
    for?: string;
    /** `legend` heads a fieldset. Without `for` the default is `span`. */
    as?: 'label' | 'span' | 'legend';
    id?: string;
    /** Kept for assistive technology and not drawn. */
    hidden?: boolean;
    /** Replaces the field label class, for a choice or a group label. */
    class?: string;
    /** Rendered after the marker, inside the label. */
    children?: Snippet;
  }

  let {
    text,
    required = false,
    for: htmlFor = undefined,
    as = undefined,
    id = undefined,
    hidden = false,
    class: klass = FIELD_LABEL,
    children,
  }: Props = $props();

  const tag = $derived(as ?? (htmlFor === undefined ? 'span' : 'label'));
  const cls = $derived(hidden ? `${klass} sr-only` : klass);
</script>

{#snippet content()}{text}{#if required}<span class="ms-0.5 text-danger" aria-hidden="true">*</span
    >{/if}{@render children?.()}{/snippet}

{#if tag === 'label'}
  <label {id} for={htmlFor} class={cls}>{@render content()}</label>
{:else if tag === 'legend'}
  <legend {id} class={cls}>{@render content()}</legend>
{:else}
  <span {id} class={cls}>{@render content()}</span>
{/if}
