<script lang="ts">
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_LABEL,
    FIELD_WRAP,
    describedBy,
  } from '../internal/field.js';
  interface Props {
    id?: string;
    name?: string;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    error?: string;
    hint?: string;
    label?: string;
    class?: string;
    onchange?: (files: FileList | null) => void;
  }

  let {
    id = undefined,
    name = undefined,
    accept = undefined,
    multiple = false,
    disabled = false,
    error = undefined,
    hint = undefined,
    label = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  let dragOver = $state(false);

  function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
    onchange?.(e.currentTarget.files);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (disabled) return;
    onchange?.(e.dataTransfer?.files ?? null);
  }
</script>

<div class="{FIELD_WRAP} {cls}">
  {#if label}
    <label for={id} class={FIELD_LABEL}>{label}</label>
  {/if}

  <!-- The dashed border is the only thing marking this region as a control, so
       it rests on line-strong: line reads 1.25:1 and failed SC 1.4.11. The
       hover is full-strength brand, because a focus-adjacent colour dropped to
       half alpha reads as a weaker affordance for no reason a user can infer. -->
  <label
    class="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
      border-2 border-dashed px-4 py-8 text-center transition-colors duration-150
      {error
      ? 'border-danger bg-danger/5 hover:bg-danger/8'
      : dragOver
        ? 'border-brand bg-brand/8'
        : 'border-line-strong bg-surface-2/40 hover:border-brand hover:bg-brand/5'}
      {disabled ? 'cursor-not-allowed opacity-50' : ''}"
    ondragover={(e) => {
      e.preventDefault();
      dragOver = true;
    }}
    ondragleave={() => (dragOver = false)}
    ondrop={handleDrop}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={error ? 'text-danger' : 'text-faint'}
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
    <div class="text-sm">
      <span class="{error ? 'text-danger' : 'text-brand'} font-medium">Click to upload</span>
      <span class="text-muted"> or drag & drop</span>
      {#if accept}<p class="mt-0.5 text-xs text-faint">{accept}</p>{/if}
    </div>
    <input
      type="file"
      {id}
      {name}
      {accept}
      {multiple}
      {disabled}
      onchange={handleChange}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(id, error, hint)}
      class="sr-only"
    />
  </label>

  {#if error}
    <p id={id ? `${id}-error` : undefined} class={FIELD_ERROR}>{error}</p>
  {:else if hint}
    <p id={id ? `${id}-hint` : undefined} class={FIELD_HINT}>{hint}</p>
  {/if}
</div>
