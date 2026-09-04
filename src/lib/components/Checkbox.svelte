<script lang="ts">
  import type { Component } from 'svelte';
  import { FIELD_ERROR, FIELD_HINT, FIELD_WRAP } from '../internal/field.js';
  import {
    CHOICE_DESCRIPTION,
    CHOICE_FOCUS,
    CHOICE_ICON_PX,
    CHOICE_INPUT,
    CHOICE_LABEL_STACK,
    CHOICE_MARK,
    choiceBox,
    choiceIcon,
    choiceLabel,
    choiceWrap,
    type ChoiceSize,
    type ChoiceVariant,
  } from '../internal/choice.js';

  interface Props {
    checked?: boolean;
    /** Partly checked. Announced as aria-checked="mixed". */
    indeterminate?: boolean;
    label?: string;
    /** Screen-reader-only label, for a checkbox in a table cell whose column header is the visible name. */
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
    value?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
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
    value = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  // $props.id() and not a random string: a random id differs between the server
  // render and hydration, so every aria-describedby built from it points at an
  // element that does not exist on the client.
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  // Error, then hint, then description. A screen reader announces one message,
  // so the most urgent one has to win rather than the last one rendered.
  const messageId = $derived(
    error
      ? `${fieldId}-error`
      : hint
        ? `${fieldId}-hint`
        : description
          ? `${fieldId}-description`
          : undefined,
  );

  // A part-checked box is on, not a third colour, so it paints the filled box
  // and tints the card exactly as a checked one does.
  const on = $derived(checked || indeterminate);

  // A card fills its column. An inline option must not: stretched to the full
  // width of the field wrapper, the label swallows the empty space beside it
  // and a stray click far from the box toggles the value.
  const rootClass = $derived(variant === 'card' ? FIELD_WRAP : `${FIELD_WRAP} items-start`);

  function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
    // Disabled is enforced here as well as on the input. The native attribute
    // is what stops a real click, and it is the only thing that does, so a
    // change arriving any other way - a synthetic event, a script driving the
    // node - would still move the bound value with nothing on screen to say so.
    if (disabled) return;
    // The DOM clears indeterminate on the first click. Leaving the prop set
    // would repaint the mixed bar over a box the user has just ticked.
    indeterminate = false;
    checked = e.currentTarget.checked;
    onchange?.(checked);
  }
</script>

{#snippet control()}
  <input
    type="checkbox"
    id={fieldId}
    {name}
    {value}
    {required}
    {disabled}
    {checked}
    {indeterminate}
    aria-checked={indeterminate ? 'mixed' : undefined}
    aria-invalid={error ? 'true' : undefined}
    aria-labelledby={label ? `${fieldId}-label` : undefined}
    aria-describedby={messageId}
    onchange={handleChange}
    class={CHOICE_INPUT}
  />
{/snippet}

{#snippet mark()}
  <span class="{choiceBox('checkbox', size, checked, indeterminate)} mt-0.5">
    {#if on}
      <!-- Both marks are stroked paths on one 10 by 8 grid. A Unicode check
           lands at whatever weight the reader's font gives it, visibly lighter
           than every other icon in the kit, and the mixed bar has no glyph that
           is not a minus sign standing in for one. -->
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
        <path
          d={indeterminate ? CHOICE_MARK.mixed : CHOICE_MARK.check}
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
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
                 whole paragraph before it reached the checked state. -->
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
         peer ring can reach and the box inside it is not. That is deliberate:
         one control gets one focus indicator, and a ring on the box drawn
         inside a ring on the card reads as two separate things to focus. -->
    <label class="relative block">
      {@render control()}
      <span class="{choiceWrap('card', on, disabled)} {CHOICE_FOCUS}">
        {@render mark()}
        {@render body()}
      </span>
    </label>
  {:else}
    <label class={choiceWrap('inline', on, disabled)}>
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
