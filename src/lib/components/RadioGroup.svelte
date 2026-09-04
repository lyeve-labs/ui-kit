<script lang="ts" module>
  import type { Component } from 'svelte';

  /**
   * One option in a choice group.
   *
   * CheckboxGroup declares this interface in the same words, so a consumer who
   * has written one option list can write the other without rereading the
   * types. A colocated test compares the two declarations character for
   * character, because the group and the single control had already drifted
   * apart once.
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
  import Radio from './Radio.svelte';

  interface Props {
    /** The selected value. One of the option values, or empty for none. */
    value?: string;
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
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(''),
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
   * This group built its name from `rg-${Math.random()}`, which produces one
   * value on the server and a different one on hydration, so every id and every
   * name derived from it changed under the client on first paint. Two radios
   * that disagree about their name are two groups, and selecting one no longer
   * clears the other.
   */
  const uid = $props.id();
  const groupName = $derived(name ?? uid);
</script>

<!--
  role="radiogroup" over the fieldset's implicit "group". A set of radios is a
  radiogroup, and that is the role ARIA lets carry aria-invalid and
  aria-required, so the group can report its own validity rather than leaving a
  reader to find the message paragraph on their own.
-->
<fieldset
  class="{CHOICE_GROUP} {cls}"
  role="radiogroup"
  {disabled}
  aria-invalid={error ? 'true' : undefined}
  aria-required={required ? 'true' : undefined}
  aria-describedby={describedBy(uid, error, hint)}
>
  <!--
    The legend stays a legend when it is hidden. Swapping it for an aria-label
    on the fieldset would name the group and drop it out of the reading order,
    so a reader moving through the page would meet the options with nothing
    ahead of them saying what the set is for.
  -->
  <legend class="{FIELD_LABEL} {labelHidden ? 'sr-only' : ''}">
    {label}{#if required}<span class="text-danger ml-0.5" aria-hidden="true">*</span>{/if}
  </legend>

  <div class={choiceGroupList(orientation)}>
    {#each options as option (option.value)}
      <!--
        The option renders through Radio rather than through a copy of it. The
        copy is what let this group rest its circle on border-line, at 1.25:1,
        and keep its focus ring inside the selected branch, so choosing an
        option deleted the only indicator a keyboard user had. Radio had been
        fixed for both defects while the group still carried them.
      -->
      <Radio
        bind:group={value}
        value={option.value}
        label={option.label}
        description={option.description}
        icon={option.icon}
        name={groupName}
        {size}
        {variant}
        disabled={disabled || option.disabled === true}
        {onchange}
      />
    {/each}
  </div>

  {#if error}
    <p id="{uid}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{uid}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</fieldset>
