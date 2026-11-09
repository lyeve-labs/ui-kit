<script lang="ts">
  import FieldMessage from '../internal/FieldMessage.svelte';
  import FieldLabel from '../internal/FieldLabel.svelte';
  import { assistField } from '../internal/assist.svelte.js';
  import { Eye, EyeOff } from '@lucide/svelte';
  import { HIT_AREA_POSITIONED } from '../internal/touch.js';
  import { CONTROL_BASE, FIELD_WRAP, controlBorder, describedBy } from '../internal/field.js';

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
    /**
     * Keeps the value from an assistant: a FormAssist never reports it and
     * never fills it. Also marks the control `data-no-ai` for a browser agent.
     */
    noAI?: boolean;
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
    noAI = false,
  }: Props = $props();

  // Withheld by its kind: the form describes it by label alone, and a
  // suggestion for it is refused, so it never draws the suggested state.
  assistField({
    get name() {
      return name;
    },
    get label() {
      return label;
    },
    kind: 'secret',
    get noAI() {
      return noAI;
    },
    get value() {
      return '';
    },
    set value(_) {},
  });

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

  // bind:value rather than a one-way value: on hydration it adopts what the
  // field already holds, so a password typed or autofilled before the page
  // took over is kept. A one-way value set the field back to empty, and the
  // form then refused to submit with the password still shown as required.
  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    oninput?.(e);
  }
</script>

<div data-field data-no-ai={noAI ? '' : undefined} class="{FIELD_WRAP} {klass}">
  {#if label}
    <FieldLabel for={fieldId} text={label} {required} hidden={labelHidden} />
  {/if}

  <div class="relative">
    <!-- pe-10 overrides the px-3 CONTROL_BASE states, because `pe` is emitted
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
      bind:value
      oninput={handleInput}
      {onchange}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(fieldId, error, hint)}
      class="{CONTROL_BASE} {controlBorder(!!error)} {showToggle ? 'pe-10' : ''} {controlClass}"
    />

    {#if showToggle}
      <!-- type="button" is load bearing. A button inside a form defaults to
           type="submit", so a reveal control on a login form posted the form
           on the first click and the user never saw what they had typed.
           The button holds its 27px around a 14px icon, the rung of the
           text it sits on, so its touch target stays where it was. -->
      <button
        type="button"
        onclick={() => (revealed = !revealed)}
        aria-pressed={revealed}
        aria-controls={fieldId}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        class="{HIT_AREA_POSITIONED} absolute top-1/2 end-1 flex size-6.75 -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-faint outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        {#if revealed}
          <EyeOff size={14} aria-hidden="true" />
        {:else}
          <Eye size={14} aria-hidden="true" />
        {/if}
      </button>
    {/if}
  </div>

  <FieldMessage base={fieldId} {error} {hint} />
</div>
