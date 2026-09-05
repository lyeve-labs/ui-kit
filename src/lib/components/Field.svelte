<script lang="ts" module>
  /**
   * What Field hands the control it wraps.
   *
   * The wiring is the whole point of the component. A consumer building a
   * control the kit does not ship - a colour well, a code editor, a third
   * party map picker - cannot reach internal/field.ts, so it hand-copies the
   * class strings and stops there: a form in a consuming app spelled
   * `class="flex flex-col gap-1.5"` inline, which is the literal value of
   * FIELD_WRAP, and then wired nothing. The control had no id, the label had
   * no `for`, and the error paragraph under it was never announced.
   */
  export interface FieldWiring {
    /** The id the control must carry. The label's `for` already points at it. */
    id: string;
    /**
     * The id of whichever message is on screen, for the control's
     * `aria-describedby`. Undefined when there is neither a hint nor an error,
     * so the attribute is left off rather than pointing at nothing.
     */
    describedBy: string | undefined;
    /** True while an error is showing, for the control's `aria-invalid`. */
    invalid: boolean;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    describedBy,
  } from '../internal/field.js';

  interface Props {
    /** Overrides the generated id, for a control the caller has to address by name. */
    id?: string;
    label?: string;
    /** Screen-reader-only label, for a control whose visible name is a table column header. */
    labelHidden?: boolean;
    hint?: string;
    /** Replaces the hint while it is set, and marks the wiring invalid. */
    error?: string;
    /**
     * Draws the marker beside the label. Set `required` on the control as well:
     * the marker is decorative and the control's own attribute is what a screen
     * reader reports.
     */
    required?: boolean;
    class?: string;
    /** Receives what the control must carry so the message row actually reaches a screen reader. */
    children: Snippet<[FieldWiring]>;
  }

  let {
    id = undefined,
    label = undefined,
    labelHidden = false,
    hint = undefined,
    error = undefined,
    required = false,
    class: klass = '',
    children,
  }: Props = $props();

  /*
   * $props.id(), never Math.random(). A random id is one value in the server
   * render and a different one on hydration, so the label's `for` and the id
   * the control was given stop matching the moment the client takes over, and
   * clicking the label focuses nothing.
   */
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  const wiring: FieldWiring = $derived({
    id: fieldId,
    describedBy: describedBy(fieldId, error, hint),
    invalid: !!error,
  });
</script>

<div class="{FIELD_WRAP} {klass}">
  {#if label}
    <!--
      A hidden label stays a real label with a real `for`. Swapping it for an
      aria-label on the control would name the control and drop the name out of
      the reading order, so a reader moving through a row of them would meet
      the controls with nothing ahead of them saying what each one is.
    -->
    <label for={fieldId} class="{FIELD_LABEL} {labelHidden ? 'sr-only' : ''}">
      {label}{#if required}<span class="ml-0.5 text-danger" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  {@render children(wiring)}

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
