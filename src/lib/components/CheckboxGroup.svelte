<script lang="ts" module>
  import type { Component } from 'svelte';

  /**
   * One option in a choice group.
   *
   * RadioGroup declares this interface in the same words, so a consumer who has
   * written one option list can write the other without rereading the types. A
   * colocated test compares the two declarations character for character,
   * because the group and the single control had already drifted apart once.
   */
  export interface ChoiceOption {
    /** The submitted value, and the key the option is rendered under. */
    value: string;
    /** Names this one choice. The group is named by the legend instead. */
    label: string;
    /** A second line under the label, carrying what the label leaves out. */
    description?: string;
    /** A lucide component. The group sizes it, so the caller does not guess. */
    icon?: Component<{ size?: number; class?: string }>;
    /** Blocks this option alone. A disabled group blocks every option. */
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import {
    CHOICE_GROUP,
    choiceGroupList,
    type ChoiceOrientation,
    type ChoiceSize,
    type ChoiceVariant,
  } from '../internal/choice.js';
  import { FIELD_ERROR, FIELD_HINT, FIELD_LABEL, describedBy } from '../internal/field.js';
  import Checkbox from './Checkbox.svelte';

  interface Props {
    /** The chosen values, ordered by `options` rather than by click order. */
    value?: string[];
    options: ChoiceOption[];
    /**
     * The group's accessible name, rendered as a legend. Required because an
     * unnamed group announces as a bare set of controls, which leaves a reader
     * to infer what the set is for from the options alone.
     */
    label: string;
    /** Keeps the legend for a screen reader and takes it off the screen. */
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    name?: string;
    orientation?: ChoiceOrientation;
    size?: ChoiceSize;
    variant?: ChoiceVariant;
    required?: boolean;
    disabled?: boolean;
    class?: string;
    onchange?: (value: string[]) => void;
  }

  let {
    value = $bindable([]),
    options,
    label,
    labelHidden = false,
    hint = undefined,
    error = undefined,
    name = undefined,
    orientation = 'vertical',
    size = 'md',
    variant = 'inline',
    required = false,
    disabled = false,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  /*
   * The instance id, and through it the shared name, comes from $props.id().
   * RadioGroup built its name from Math.random(), which produces one value on
   * the server and a different one on hydration, so every id and every name
   * derived from it changed under the client on first paint.
   */
  const uid = $props.id();
  const groupName = $derived(name ?? uid);

  const chosen = $derived(new Set(value));

  function toggle(option: string, on: boolean) {
    const next = new Set(value);
    if (on) {
      next.add(option);
    } else {
      next.delete(option);
    }
    // Filtered out of `options` rather than appended on click, so ticking C
    // and then A submits the same value as ticking A and then C.
    value = options.filter((o) => next.has(o.value)).map((o) => o.value);
    onchange?.(value);
  }
</script>

<!--
  No aria-invalid here, where RadioGroup carries one. ARIA supports the
  attribute on radiogroup and not on group, which is the role a fieldset of
  checkboxes has and the only role that fits it, so the kit's a11y gate rejects
  it outright. The error still reaches a reader through aria-describedby, which
  is global and points at the message paragraph below.
-->
<fieldset class="{CHOICE_GROUP} {cls}" {disabled} aria-describedby={describedBy(uid, error, hint)}>
  <!--
    The legend stays a legend when it is hidden. Swapping it for an aria-label
    on the fieldset would name the group and drop it out of the reading order,
    so a reader moving through the page would meet the options with nothing
    ahead of them saying what the set is for.
  -->
  <legend class="{FIELD_LABEL} {labelHidden ? 'sr-only' : ''}">
    {label}{#if required}<span class="text-danger ml-0.5" aria-label="required">*</span>{/if}
  </legend>

  <div class={choiceGroupList(orientation)}>
    {#each options as option (option.value)}
      <!--
        The option renders through Checkbox rather than through a copy of it.
        A group that paints its own box is how RadioGroup came to rest on
        border-line and to keep its focus ring inside the selected branch while
        the single control had been fixed for both.
      -->
      <Checkbox
        checked={chosen.has(option.value)}
        value={option.value}
        label={option.label}
        description={option.description}
        icon={option.icon}
        name={groupName}
        {size}
        {variant}
        disabled={disabled || option.disabled === true}
        onchange={(on) => toggle(option.value, on)}
      />
    {/each}
  </div>

  {#if error}
    <p id="{uid}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{uid}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</fieldset>
