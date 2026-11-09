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
  import AssistActions from './AssistActions.svelte';
  import type { AssistField } from './assist.svelte.js';
  import { ASSIST_TAG, FIELD_LABEL } from './field.js';

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
    /**
     * The field's FormAssist registration. While it is pending the label gains
     * the Suggested tag, and a legend also gains the accept and reject buttons,
     * inside it when it is drawn and right after it when it is hidden.
     */
    assist?: AssistField;
    /**
     * The id of the legend's text while the legend holds the buttons, for the
     * fieldset's aria-labelledby. Read in full, the legend would name the group
     * after the buttons as well.
     */
    nameId?: string;
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
    assist = undefined,
    nameId = undefined,
  }: Props = $props();

  const pending = $derived(assist?.pending === true);

  const tag = $derived(as ?? (htmlFor === undefined ? 'span' : 'label'));
  const cls = $derived(hidden ? `${klass} sr-only` : klass);
</script>

<!-- The tag is hidden from assistive technology so it never joins the name a
     voice-control user speaks. The buttons beside it say what is suggested. -->
{#snippet content()}{text}{#if required}<span class="ms-0.5 text-danger" aria-hidden="true">*</span
    >{/if}{@render children?.()}{#if pending}<span class={ASSIST_TAG} aria-hidden="true"
      >Suggested</span
    >{/if}{/snippet}

{#if tag === 'label'}
  <label {id} for={htmlFor} class={cls}>{@render content()}</label>
{:else if tag === 'legend' && pending && assist && hidden}
  <!-- A hidden legend keeps its buttons outside it, where they are seen and
       reached. Inside a visually hidden legend they would take focus unseen. -->
  <legend {id} class={cls}><span id={nameId}>{@render content()}</span></legend>
  <AssistActions field={assist} />
{:else if tag === 'legend' && pending && assist}
  <legend {id} class="{cls} flex w-full items-center gap-2">
    <span id={nameId}>{@render content()}</span>
    <AssistActions field={assist} />
  </legend>
{:else if tag === 'legend'}
  <legend {id} class={cls}>{@render content()}</legend>
{:else}
  <span {id} class={cls}>{@render content()}</span>
{/if}
