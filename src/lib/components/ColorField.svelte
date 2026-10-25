<script lang="ts" module>
  /** One color a ColorField offers as a swatch. */
  export interface ColorSwatch {
    /** What the field stores when this swatch is picked, such as a theme token's name. */
    value: string;
    /** Names the swatch to a screen reader and on hover. */
    label: string;
    /** What the swatch paints: any CSS color, such as `#2F6FEB` or `var(--brand)`. */
    color: string;
  }

  /**
   * Six upper-case hex digits after a #, from "#2f6feb", "2F6FEB", the short
   * "#26E" or any of them with spaces around. Null for anything else.
   */
  export function normalizeHex(input: string): string | null {
    const digits = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim())?.[1];
    if (digits === undefined) return null;
    const six = digits.length === 3 ? digits.replace(/./g, (d) => d + d) : digits;
    return `#${six.toUpperCase()}`;
  }
</script>

<script lang="ts">
  /**
   * A color, typed as hex or picked from a set of swatches.
   *
   * Without swatches it is a text field with the color drawn inside its
   * start. It takes #2F6FEB, 2f6feb or the short #26E and stores six
   * upper-case digits after a #. Text that reads as no color is refused when
   * the reader leaves the field, and from then on the message follows what
   * they type. The browser's own color input opens a picker no stylesheet
   * reaches, so the kit never draws one.
   *
   * With swatches it is a radio group, and the value is the picked swatch's
   * value, which can be a theme token's name rather than a hex. A stored
   * value no swatch carries any longer stays until the reader picks another,
   * and the field says so.
   */
  import { CHOICE_FOCUS, CHOICE_GROUP, CHOICE_LEGEND } from '../internal/choice.js';
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
  import { TOUCH_GROW } from '../internal/touch.js';

  interface Props {
    /** Six upper-case hex digits after a #, a swatch's value, or empty for none. */
    value?: string;
    label?: string;
    hint?: string;
    /** The caller's own refusal, shown in place of the field's. */
    error?: string;
    /**
     * Ids of other elements that describe the field, separated by spaces, such
     * as the message a wrapping Field renders. They are read after the field's
     * own hint or error.
     */
    describedBy?: string;
    /** Offers these colors as a radio group in place of the text field. */
    swatches?: ColorSwatch[];
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    class?: string;
  }

  let {
    value = $bindable(''),
    label = undefined,
    hint = undefined,
    error = undefined,
    describedBy: callerIds = undefined,
    swatches = undefined,
    disabled = false,
    required = false,
    id = undefined,
    name = undefined,
    class: klass = '',
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  /**
   * What the reader typed over a value. A new value from the caller replaces
   * it, because the draft then belongs to a value no longer shown.
   */
  let draft = $state<{ over: string; text: string } | null>(null);
  const text = $derived(draft !== null && draft.over === value ? draft.text : value);
  // Dropped once the value moves, or the draft would come back with an undo
  // that returns to the value it was typed over.
  $effect.pre(() => {
    if (draft !== null && draft.over !== value) draft = null;
  });
  let left = $state(false);
  const refusal = $derived(
    left && text.trim() !== '' && normalizeHex(text) === null
      ? 'Enter a color as # and six hex digits, such as #2F6FEB.'
      : undefined,
  );
  const message = $derived(error ?? refusal);

  function settle() {
    left = true;
    const hex = normalizeHex(text);
    if (hex !== null) {
      value = hex;
      draft = null;
    } else if (text.trim() === '') {
      value = '';
      draft = null;
    }
  }

  /** A stored value that no swatch offers any longer. */
  const missing = $derived(
    swatches !== undefined && value !== '' && !swatches.some((s) => s.value === value),
  );
</script>

{#if swatches}
  <!-- role="radiogroup" over the fieldset's implicit "group", as RadioGroup
       does, so the group can carry its own validity. -->
  <fieldset
    data-field
    {id}
    class="{CHOICE_GROUP} {klass}"
    role="radiogroup"
    {disabled}
    aria-invalid={error ? 'true' : undefined}
    aria-required={required ? 'true' : undefined}
    aria-describedby={joinIds(describedBy(fieldId, error, missing ? value : hint), callerIds)}
  >
    {#if label}
      <legend class={CHOICE_LEGEND}>
        {label}{#if required}<span class="text-danger ms-0.5" aria-hidden="true">*</span>{/if}
      </legend>
    {/if}
    <div class="flex flex-wrap gap-2">
      {#each swatches as swatch (swatch.value)}
        <label class="relative" title={swatch.label}>
          <input
            type="radio"
            class="peer sr-only"
            name={name ?? uid}
            value={swatch.value}
            aria-label={swatch.label}
            bind:group={value}
          />
          <!-- The ring keeps a swatch the color of the page in sight, and a
               checked one draws a thicker ring in the text color, so the pick
               never rests on the swatch's own color. -->
          <span
            aria-hidden="true"
            class="block size-7 cursor-pointer rounded-full ring-1 ring-line-strong peer-checked:ring-2 peer-checked:ring-fg peer-disabled:cursor-not-allowed peer-disabled:opacity-50 {TOUCH_GROW} {CHOICE_FOCUS}"
            style:background-color={swatch.color}
          ></span>
        </label>
      {/each}
    </div>
    {#if missing && name}
      <!-- No radio is checked, so a form would send nothing for the field and
           a save would wipe the color it says it keeps. -->
      <input type="hidden" {name} {value} />
    {/if}
    {#if error}
      <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
    {:else if missing}
      <p id="{fieldId}-hint" class={FIELD_HINT}>
        The stored color <span class="font-mono text-fg">{value}</span> is no longer in the theme.
      </p>
    {:else if hint}
      <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
    {/if}
  </fieldset>
{:else}
  <div data-field class="{FIELD_WRAP} {klass}">
    {#if label}
      <label for={fieldId} class={FIELD_LABEL}>
        {label}{#if required}<span class="text-danger ms-0.5" aria-hidden="true">*</span>{/if}
      </label>
    {/if}
    <div class="relative">
      <span
        aria-hidden="true"
        class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 rounded-sm ring-1 ring-line-strong"
        style:background-color={value || 'transparent'}
      ></span>
      <input
        id={fieldId}
        type="text"
        {name}
        {disabled}
        {required}
        value={text}
        placeholder="#2F6FEB"
        pattern={'\\s*#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\s*'}
        autocomplete="off"
        spellcheck="false"
        aria-invalid={message ? 'true' : undefined}
        aria-describedby={joinIds(describedBy(fieldId, message, hint), callerIds)}
        class="{CONTROL_BASE} {controlBorder(!!message)} ps-9 font-mono"
        oninput={(e) => (draft = { over: value, text: e.currentTarget.value })}
        onchange={settle}
      />
    </div>
    {#if message}
      <p id="{fieldId}-error" class={FIELD_ERROR}>{message}</p>
    {:else if hint}
      <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
    {/if}
  </div>
{/if}
