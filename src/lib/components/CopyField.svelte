<script lang="ts">
  /**
   * A value the reader copies, with the copy control inside the field.
   *
   * Consoles drew a read-only Input and a separate outlined button beside it,
   * so the pair read as two controls of different heights and the button
   * floated on its own at the end of a long row. The control sits inside the
   * field's end the way PasswordInput's reveal does, and confirms by turning
   * its icon into a check in place.
   *
   * Focusing the field selects the whole value, so a reader who would rather
   * copy by keyboard gets all of it and never a part.
   *
   * `secret` masks the value and adds PasswordInput's reveal beside the copy,
   * for a token or a key that should not sit readable on a shared screen. The
   * copy writes the value whether or not it is shown.
   *
   * `actions` adds the caller's own controls in the same row, before the
   * reveal and the copy: a rotate, a regenerate, a link out. They sit in the
   * field's own row, so any number of them fits without covering the value.
   *
   * `wrap` shows the whole value over as many lines as it takes, for a key or
   * an address the reader has to check end to end rather than recognize.
   */
  import type { Snippet } from 'svelte';
  import { Eye, EyeOff } from '@lucide/svelte';
  import { HIT_AREA } from '../internal/touch.js';
  import CopyGlyph from '../internal/CopyGlyph.svelte';
  import { COPY_FAILED_MESSAGE, CopyState } from '../internal/copy.svelte.js';
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    describedBy,
  } from '../internal/field.js';

  interface Props {
    /** The text shown and written to the clipboard. */
    value: string;
    id?: string;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    /** Monospace, for keys, secrets, hashes and addresses. On by default. */
    mono?: boolean;
    /** Mask the value and offer a control that reveals it. */
    secret?: boolean;
    /**
     * Wraps the whole value across lines instead of showing one truncated
     * line. It breaks anywhere, since a key or a token has no spaces to break
     * at. A masked secret stays on one line, because its dots carry nothing
     * to read, and wraps once revealed.
     */
    wrap?: boolean;
    /** Extra controls inside the field's end, before the reveal and the copy. */
    actions?: Snippet;
    /** The copy control's accessible name. Defaults to "Copy" and the label. */
    copyLabel?: string;
    /** Announced after a successful copy. */
    copiedLabel?: string;
    class?: string;
  }

  let {
    value,
    id = undefined,
    label = undefined,
    labelHidden = false,
    hint = undefined,
    mono = true,
    secret = false,
    wrap = false,
    actions = undefined,
    copyLabel = undefined,
    copiedLabel = 'Copied',
    class: klass = '',
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(id ?? uid);
  const buttonName = $derived(copyLabel ?? (label ? `Copy ${label.toLowerCase()}` : 'Copy'));

  const copier = new CopyState();
  let revealed = $state(false);
  const masked = $derived(secret && !revealed);
  const wrapped = $derived(wrap && !masked);
  const failed = $derived(copier.status === 'failed');

  $effect(() => () => copier.dispose());
</script>

<div data-field class="{FIELD_WRAP} {klass}">
  {#if label}
    <label for={fieldId} class="{FIELD_LABEL} {labelHidden ? 'sr-only' : ''}">{label}</label>
  {/if}

  <!-- The frame is the control: the value and its buttons sit in one row
       inside it, so the caller's actions, the reveal and the copy all fit
       without the value running under them and without measuring anything.
       The frame takes the focus ring and the brand border from the input or
       the textarea inside it. A focused button draws its own ring and not the frame's. -->
  <div
    class="flex w-full gap-0.5 rounded-lg border bg-surface-2 pe-1 transition-colors border-line-strong {wrapped
      ? 'min-h-control items-start py-1 has-[textarea:focus]:border-brand has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-inset has-[textarea:focus-visible]:ring-brand'
      : 'h-control items-center has-[input:focus]:border-brand has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-inset has-[input:focus-visible]:ring-brand'}"
  >
    {#if wrapped}
      <!-- An input holds one line, so the wrapped value is a read-only
           textarea. A textarea does not grow with its text, so it sits in one
           grid cell with an invisible copy of the value, and the copy sets the
           height. The padding and the frame's together keep one line at the
           control height. -->
      <div class="grid min-w-0 flex-1">
        <span
          aria-hidden="true"
          class="invisible col-start-1 row-start-1 px-3 py-1 text-sm break-all whitespace-pre-wrap {mono
            ? 'font-mono'
            : ''}">{value}</span
        >
        <textarea
          id={fieldId}
          rows={1}
          autocomplete="off"
          spellcheck="false"
          readonly
          {value}
          onfocus={(e) => e.currentTarget.select()}
          aria-describedby={describedBy(fieldId, failed ? COPY_FAILED_MESSAGE : undefined, hint)}
          class="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent px-3 py-1 text-sm break-all whitespace-pre-wrap text-fg outline-none {mono
            ? 'font-mono'
            : ''}"
        ></textarea>
      </div>
    {:else}
      <input
        id={fieldId}
        type={masked ? 'password' : 'text'}
        autocomplete="off"
        readonly
        {value}
        onfocus={(e) => e.currentTarget.select()}
        aria-describedby={describedBy(fieldId, failed ? COPY_FAILED_MESSAGE : undefined, hint)}
        class="h-full min-w-0 flex-1 truncate bg-transparent px-3 text-sm text-fg outline-none {mono
          ? 'font-mono'
          : ''}"
      />
    {/if}
    {@render actions?.()}
    {#if secret}
      <button
        type="button"
        onclick={() => (revealed = !revealed)}
        aria-pressed={revealed}
        aria-controls={fieldId}
        aria-label={revealed ? 'Hide value' : 'Show value'}
        class="{HIT_AREA} flex shrink-0 items-center justify-center rounded-md p-1.5 text-faint outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        {#if revealed}
          <EyeOff size={15} aria-hidden="true" />
        {:else}
          <Eye size={15} aria-hidden="true" />
        {/if}
      </button>
    {/if}
    <button
      type="button"
      aria-label={buttonName}
      onclick={() => copier.copy(value)}
      class="{HIT_AREA} flex shrink-0 items-center justify-center rounded-md p-1.5 text-faint outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
    >
      <CopyGlyph copied={copier.status === 'copied'} size={15} />
    </button>
  </div>

  <!-- Mounted empty for the life of the field, so a copy is a change a screen
       reader announces rather than a region that arrives already full. The
       check is the sighted confirmation. Only a failure is shown in words. -->
  <p
    role="status"
    aria-live="polite"
    aria-atomic="true"
    id={failed ? `${fieldId}-error` : undefined}
    class={failed ? FIELD_ERROR : 'sr-only'}
  >
    {copier.status === 'copied' ? copiedLabel : failed ? COPY_FAILED_MESSAGE : ''}
  </p>
  {#if hint && !failed}
    <p id="{fieldId}-hint" class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
