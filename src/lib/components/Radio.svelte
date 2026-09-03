<script lang="ts">
  import { FIELD_HINT } from '../internal/field.js';
  interface Props {
    value: string;
    group?: string;
    label?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    name?: string;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value,
    group = $bindable(''),
    label = undefined,
    hint = undefined,
    required = false,
    disabled = false,
    id = undefined,
    name = undefined,
    class: cls = '',
    onchange = undefined,
  }: Props = $props();

  function handleChange() {
    group = value;
    onchange?.(value);
  }
</script>

<label
  class="inline-flex cursor-pointer select-none items-start gap-2.5
    {disabled ? 'cursor-not-allowed opacity-50' : ''} {cls}"
>
  <span class="relative mt-0.5 flex shrink-0 items-center justify-center">
    <input
      type="radio"
      {id}
      {name}
      {value}
      {required}
      {disabled}
      checked={group === value}
      onchange={handleChange}
      class="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
    <!-- The focus ring is stated once, outside the selected branch. It used to
         sit only on the unselected classes, so choosing an option removed the
         only indicator a keyboard user had. A ring rather than a border colour,
         because when selected the border is already brand. -->
    <span
      class="pointer-events-none flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors duration-150
        peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand peer-focus-visible:outline-offset-2
        {group === value ? 'border-brand bg-surface-2' : 'border-line-strong bg-surface-2'}"
    >
      {#if group === value}
        <span class="h-2 w-2 rounded-full bg-brand"></span>
      {/if}
    </span>
  </span>
  {#if label || hint}
    <span class="flex flex-col gap-0.5">
      {#if label}<span class="text-sm text-fg">{label}</span>{/if}
      {#if hint}<span class={FIELD_HINT}>{hint}</span>{/if}
    </span>
  {/if}
</label>
