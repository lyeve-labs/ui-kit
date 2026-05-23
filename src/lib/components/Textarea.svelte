<script lang="ts">
  type TA = HTMLTextAreaElement;
  type TAE = Event & { currentTarget: TA };

  let {
    value = $bindable(''),
    id,
    name,
    placeholder,
    rows = 4,
    required = false,
    disabled = false,
    readonly = false,
    resize = true,
    error,
    class: cls = '',
    oninput,
    onblur,
  }: {
    value?: string;
    id?: string;
    name?: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    resize?: boolean;
    error?: string;
    class?: string;
    oninput?: (e: TAE) => void;
    onblur?: (e: FocusEvent & { currentTarget: TA }) => void;
  } = $props();

  const base =
    'w-full bg-surface-2 rounded-lg px-3 py-2 text-sm text-fg ' +
    'focus:outline-none transition-colors ' +
    'placeholder:text-faint ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  function handleInput(e: TAE) {
    value = e.currentTarget.value;
    oninput?.(e);
  }
</script>

<div class="flex flex-col gap-1 {cls}">
  <textarea
    {id}
    {name}
    {rows}
    {required}
    {disabled}
    {readonly}
    {placeholder}
    class="{base}
      {error
      ? 'border border-danger focus:border-danger/70'
      : 'border border-line focus:border-brand/50'}
      {resize ? 'resize-y' : 'resize-none'}"
    oninput={handleInput}
    {onblur}>{value}</textarea
  >
  {#if error}
    <p class="text-xs text-danger">{error}</p>
  {/if}
</div>
