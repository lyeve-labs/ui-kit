<script lang="ts">
  import type { Component } from 'svelte';
  import { FIELD_ERROR, FIELD_HINT, FIELD_WRAP } from '../internal/field.js';
  import {
    CHOICE_DESCRIPTION,
    CHOICE_FOCUS,
    CHOICE_ICON_PX,
    CHOICE_INPUT,
    CHOICE_LABEL_STACK,
    choiceBox,
    choiceIcon,
    choiceLabel,
    choiceWrap,
    type ChoiceSize,
    type ChoiceVariant,
  } from '../internal/choice.js';

  interface Props {
    value: string;
    group?: string;
    label?: string;
    /** Screen-reader-only label, for a radio in a table cell whose column header is the visible name. */
    labelHidden?: boolean;
    /** Secondary line under the label. */
    description?: string;
    hint?: string;
    error?: string;
    /** Drawn before the label. */
    icon?: Component<{ size?: number; class?: string }>;
    size?: ChoiceSize;
    /** 'card' draws a bordered option whose whole surface is the target. */
    variant?: ChoiceVariant;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    name?: string;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value,
    group = $bindable(''),
    label = undefined,
    labelHidden = false,
    description = undefined,
    hint = undefined,
    error = undefined,
    icon: Icon = undefined,
    size = 'md',
    variant = 'inline',
    required = false,
    disabled = false,
    id = undefined,
    name = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  /**
   * The selected dot. Only a radio draws one, so it is not part of the shared
   * choice contract, but it still steps with the ring: an 8px dot inside a 14px
   * ring leaves a hairline of background and reads as a solid filled circle.
   */
  const DOT: Record<ChoiceSize, string> = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  // $props.id() and not a random string: a random id differs between the server
  // render and hydration, so every aria-describedby built from it points at an
  // element that does not exist on the client.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  // Error, then hint, then description. A screen reader announces one message,
  // so the most urgent one has to win rather than the last one rendered. This
  // is the only route an error takes: aria-invalid is not supported on role
  // radio, and one option out of a set is not the thing that is invalid. A
  // group marks itself invalid on the fieldset that holds the options.
  const messageId = $derived(
    error
      ? `${fieldId}-error`
      : hint
        ? `${fieldId}-hint`
        : description
          ? `${fieldId}-description`
          : undefined,
  );

  const selected = $derived(group === value);

  // A card fills its column. An inline option must not: stretched to the full
  // width of the field wrapper, the label swallows the empty space beside it
  // and a stray click far from the ring selects the option.
  const rootClass = $derived(variant === 'card' ? FIELD_WRAP : `${FIELD_WRAP} items-start`);

  function handleChange() {
    // Disabled is enforced here as well as on the input. The native attribute
    // is what stops a real click, and it is the only thing that does, so a
    // change arriving any other way - a synthetic event, a script driving the
    // node - would still move the bound value with nothing on screen to say so.
    if (disabled) return;
    group = value;
    onchange?.(value);
  }
</script>

{#snippet control()}
  <input
    type="radio"
    id={fieldId}
    {name}
    {value}
    {required}
    {disabled}
    checked={selected}
    aria-labelledby={label ? `${fieldId}-label` : undefined}
    aria-describedby={messageId}
    onchange={handleChange}
    class={CHOICE_INPUT}
  />
{/snippet}

{#snippet mark()}
  <span class="{choiceBox('radio', size, selected, false)} mt-0.5">
    {#if selected}
      <span class="{DOT[size]} rounded-full bg-brand"></span>
    {/if}
  </span>
{/snippet}

{#snippet body()}
  {#if label || description || Icon}
    <span class={CHOICE_LABEL_STACK}>
      {#if label || Icon}
        <span class="flex items-center gap-2">
          {#if Icon}
            <span class={choiceIcon(size)}><Icon size={CHOICE_ICON_PX[size]} /></span>
          {/if}
          {#if label}
            <!-- Named by aria-labelledby rather than by the wrapping label, so
                 the description below stays a description. Read as the label's
                 own text it became part of the name, and the reader heard the
                 whole paragraph before it reached the selected state. -->
            <span id="{fieldId}-label" class="{choiceLabel(size)} {labelHidden ? 'sr-only' : ''}">
              {label}{#if required}<span class="ml-0.5 text-danger" aria-label="required">*</span
                >{/if}
            </span>
          {/if}
        </span>
      {/if}
      {#if description}
        <span id="{fieldId}-description" class={CHOICE_DESCRIPTION}>{description}</span>
      {/if}
    </span>
  {/if}
{/snippet}

<div class="{rootClass} {cls}">
  {#if variant === 'card'}
    <!-- The input covers the whole card, so the card surface is the element the
         peer ring can reach and the ring inside it is not. That is deliberate:
         one control gets one focus indicator, and a ring on the box drawn
         inside a ring on the card reads as two separate things to focus. -->
    <label class="relative block">
      {@render control()}
      <span class="{choiceWrap('card', selected, disabled)} {CHOICE_FOCUS}">
        {@render mark()}
        {@render body()}
      </span>
    </label>
  {:else}
    <label class={choiceWrap('inline', selected, disabled)}>
      <span class="relative flex shrink-0 items-center justify-center">
        {@render control()}
        {@render mark()}
      </span>
      {@render body()}
    </label>
  {/if}

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
