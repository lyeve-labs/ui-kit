<script lang="ts">
  import FieldMessage from '../internal/FieldMessage.svelte';
  import FieldLabel from '../internal/FieldLabel.svelte';
  import AssistRow from '../internal/AssistRow.svelte';
  import { assistField } from '../internal/assist.svelte.js';
  import {
    ASSIST_WRAP,
    CONTROL_BASE,
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
     * Monospace for the control alone: a slug, a key, a locale tag. `class`
     * lands on the wrapper, so it cannot do this.
     */
    mono?: boolean;
    /**
     * Keeps the value from an assistant: a FormAssist never reports it and
     * never fills it. Also marks the control `data-no-ai` for a browser agent.
     */
    noAI?: boolean;
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
    noAI = false,
    class: klass = '',
    ...rest
  }: Props = $props();

  // $props.id() and not the label: two fields under one label on a page took
  // one id, and both labels named the first control. It also matches between
  // the server render and hydration, which a random string would not.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  // A password is never read or filled, whatever the caller marks.
  const assist = assistField({
    get name() {
      return rest.name ?? undefined;
    },
    get label() {
      return label;
    },
    get hint() {
      return hint;
    },
    get kind() {
      return type === 'password' ? 'secret' : 'text';
    },
    get required() {
      return required;
    },
    get noAI() {
      return noAI;
    },
    get value() {
      return value;
    },
    set value(v) {
      value = v as string;
    },
  });
</script>

<div
  data-field
  data-no-ai={noAI ? '' : undefined}
  class="{FIELD_WRAP} {klass}{assist.pending ? ASSIST_WRAP : ''}"
>
  {#if label}
    <AssistRow field={assist}>
      <FieldLabel for={fieldId} text={label} {required} {assist} />
    </AssistRow>
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
    class="{CONTROL_BASE} {controlBorder(!!error, assist.suggested)} {mono ? 'font-mono' : ''}"
    {...rest}
  />

  <FieldMessage base={fieldId} {error} {hint} />
</div>
