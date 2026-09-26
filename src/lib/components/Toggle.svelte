<script lang="ts">
  import { FIELD_HINT } from '../internal/field.js';
  import { HIT_AREA } from '../internal/touch.js';
  let {
    checked = $bindable(false),
    label,
    hint,
    disabled = false,
    size = 'md',
    id,
    class: cls = '',
    onchange,
  }: {
    checked?: boolean;
    label?: string;
    hint?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    /** Lets a `<Label for=...>` outside the component target the switch. */
    id?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
  } = $props();

  const track: Record<'sm' | 'md', string> = {
    sm: 'w-8 h-4',
    md: 'w-10 h-5',
  };

  /*
   * The track carries a 1px border, so its padding box is 2px smaller than
   * the size class says. A 1px inset from that box puts the knob 2px inside
   * the outer edge, centered, with the same travel it had before the border.
   */
  const thumb: Record<'sm' | 'md', string> = {
    sm: 'w-3 h-3 top-px start-px',
    md: 'w-4 h-4 top-px start-px',
  };

  /*
   * The travel is mirrored by hand. `start-0.5` moves the resting knob to the
   * right-hand end of the track in a right-to-left page, and a positive
   * translate from there would carry it straight off the track; there is no
   * logical translate utility, so the sign is flipped instead.
   */
  const thumbOn: Record<'sm' | 'md', string> = {
    sm: 'translate-x-4 rtl:-translate-x-4',
    md: 'translate-x-5 rtl:-translate-x-5',
  };

  /*
   * Off, the track is surface-2 and so is the panel most forms sit on, so
   * without an edge only the knob showed. line-strong is the resting border
   * every other control draws (see controlBorder and choiceBox) and clears
   * 3:1 against both surface levels in both themes. On, the border takes the
   * fill's color so the fill looks as it did and the track keeps one size.
   */
  const trackPaint = {
    on: 'border-brand bg-brand',
    off: 'border-line-strong bg-surface-2',
  };

  function handleClick() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<!-- The marker is on the label because the label is the whole control: the
     switch and its text are one field, and an overlay sizing itself to a form
     counts what it can see. -->
<label
  data-field
  class="inline-flex items-start gap-2.5 cursor-pointer select-none {disabled
    ? 'opacity-50 cursor-not-allowed'
    : ''} {cls}"
>
  <button
    type="button"
    {id}
    role="switch"
    aria-checked={checked}
    aria-label={label ?? 'Toggle'}
    {disabled}
    onclick={handleClick}
    class="{HIT_AREA} shrink-0 rounded-full border transition-colors outline-none
      focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
      focus-visible:ring-offset-ink mt-0.5
      {track[size]}
      {checked ? trackPaint.on : trackPaint.off}"
  >
    <span
      class="absolute rounded-full bg-fg shadow transition-transform duration-base
        {thumb[size]}
        {checked ? thumbOn[size] : 'translate-x-0'}"
    ></span>
  </button>
  {#if label || hint}
    <span class="flex flex-col gap-0.5">
      {#if label}
        <span class="text-sm text-fg">{label}</span>
      {/if}
      {#if hint}
        <span class={FIELD_HINT}>{hint}</span>
      {/if}
    </span>
  {/if}
</label>
