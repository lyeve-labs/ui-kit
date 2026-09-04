<script lang="ts">
  import { Eye, EyeOff } from '@lucide/svelte';
  import {
    CONTROL_BASE,
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    controlBorder,
    describedBy,
  } from '../internal/field.js';

  interface Props {
    value?: string;
    id?: string;
    name?: string;
    label?: string;
    /** Renders the label to screen readers only. For a row of secrets where the visible name is a table cell. */
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    autocomplete?: 'new-password' | 'current-password' | 'off';
    /** False for a field whose value must never be shown, for instance on a shared screen. */
    revealable?: boolean;
    class?: string;
    /** Lands on the control, not on the wrapper, which is where `class` goes. */
    controlClass?: string;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  }

  let {
    value = $bindable(''),
    id = undefined,
    name = undefined,
    label = undefined,
    labelHidden = false,
    hint = undefined,
    error = undefined,
    placeholder = '',
    required = false,
    disabled = false,
    readonly = false,
    autocomplete = 'new-password',
    revealable = true,
    class: klass = '',
    controlClass = '',
    oninput = undefined,
    onchange = undefined,
  }: Props = $props();

  /**
   * $props.id() returns the same string on the server and on the client. A
   * random one does not, so `aria-controls` on the reveal button named an
   * element that never existed after hydration and the relationship was
   * silently dropped.
   */
  const uid = $props.id();
  const fieldId = $derived(id ?? uid);

  let revealed = $state(false);

  /**
   * A form reset, or a save that empties the field, leaves the component
   * mounted. Without this the last secret typed stayed legible on screen under
   * a value that no longer existed.
   */
  $effect(() => {
    if (value === '') revealed = false;
  });

  // A disabled field hands over nothing, including a look at what it holds.
  const showToggle = $derived(revealable && !disabled);

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    value = e.currentTarget.value;
    oninput?.(e);
  }
</script>

<div class="{FIELD_WRAP} {klass}">
  {#if label}
    <label for={fieldId} class="{FIELD_LABEL} {labelHidden ? 'sr-only' : ''}">
      {label}{#if required}<span class="ml-0.5 text-danger" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    <!-- pr-10 overrides the px-3 CONTROL_BASE states, because `pr` is emitted
         after `px` and so wins. Without it a long key ran under the button and
         the operator could not read the end of what they had pasted. -->
    <input
      id={fieldId}
      type={revealed ? 'text' : 'password'}
      {name}
      {placeholder}
      {required}
      {disabled}
      {readonly}
      {autocomplete}
      {value}
      oninput={handleInput}
      {onchange}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      class="{CONTROL_BASE} {controlBorder(!!error)} {showToggle ? 'pr-10' : ''} {controlClass}"
    />

    {#if showToggle}
      <!-- type="button" is load bearing. A button inside a form defaults to
           type="submit", so a reveal control on a login form posted the form
           on the first click and the user never saw what they had typed. -->
      <button
        type="button"
        onclick={() => (revealed = !revealed)}
        aria-pressed={revealed}
        aria-controls={fieldId}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        class="absolute top-1/2 right-1 flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-faint outline-none transition-colors duration-150 hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        {#if revealed}
          <EyeOff size={15} aria-hidden="true" />
        {:else}
          <Eye size={15} aria-hidden="true" />
        {/if}
      </button>
    {/if}
  </div>

  {#if error}
    <p id="{fieldId}-error" class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
