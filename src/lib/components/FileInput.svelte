<script lang="ts">
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

<div class="flex flex-col gap-1.5 {cls}">
  {#if label}
    <label for={id} class="text-sm font-medium text-fg">{label}</label>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <label
    class="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
      border-2 border-dashed px-4 py-8 text-center transition-colors
      {error
      ? 'border-danger bg-danger/5 hover:bg-danger/8'
      : dragOver
        ? 'border-brand bg-brand/8'
        : 'border-line bg-surface-2/40 hover:border-brand/50 hover:bg-brand/5'}
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
      class="sr-only"
    />
  </label>

  {#if error}
    <p class="text-xs text-danger">{error}</p>
  {:else if hint}
    <p class="text-xs text-faint">{hint}</p>
  {/if}
</div>
