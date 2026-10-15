<script lang="ts">
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
    joinIds,
  } from '../internal/field.js';
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * Attributes forwarded to the input. Naming them, rather than accepting an
   * open index signature, means a prop the component does not define fails the
   * build instead of reaching the DOM as a stray attribute.
   */
  type Forwarded = Omit<
    HTMLInputAttributes,
    'value' | 'type' | 'placeholder' | 'disabled' | 'required' | 'id' | 'name' | 'class'
  >;

  interface Props extends Forwarded {
    value?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    hint?: string;
    error?: string;
    /**
     * Ids of other elements that describe the input, separated by spaces, such
     * as the message a wrapping Field renders. They are read after the input's
     * own hint or error.
     */
    describedBy?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    /**
     * Monospace for the control alone: a slug, a key, a locale tag. Passing
     * `font-mono` as a class reached the wrapper, so the label and the hint
     * turned monospace with it.
     */
    mono?: boolean;
    class?: string;
  }

  let {
    value = $bindable(''),
    label = undefined,
    type = 'text',
    placeholder = '',
    hint = undefined,
    error = undefined,
    describedBy: callerIds = undefined,
    disabled = false,
    required = false,
    id = undefined,
    mono = false,
    class: klass = '',
    ...rest
  }: Props = $props();

  // $props.id() and not the label: two fields under one label on a page took
  // one id, and both labels named the first control. It also matches between
  // the server render and hydration, which a random string would not.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);
</script>

<div data-field class="{FIELD_WRAP} {klass}">
  {#if label}
    <label for={fieldId} class={FIELD_LABEL}>
      {label}{#if required}<span class="text-danger ms-0.5" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <input
    id={fieldId}
    {type}
    {placeholder}
    {disabled}
    {required}
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={joinIds(describedBy(fieldId, error, hint), callerIds)}
    class="{CONTROL_BASE} {controlBorder(!!error)} {mono ? 'font-mono' : ''}"
    {...rest}
  />

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
