<script lang="ts">
  // A date field at the end of a filter row, inside a box that scrolls. The
  // box's end border stands where a classic scrollbar stands: inside the
  // box's outer edge and outside the room a panel may use. Styled inline,
  // because the component suite loads no stylesheet of its own.
  import DatePicker from '../../src/lib/components/DatePicker.svelte';

  let { inset = 16, dir = 'ltr' }: { inset?: number; dir?: 'ltr' | 'rtl' } = $props();
</script>

<div
  id="clip"
  {dir}
  style="overflow-y:auto;height:520px;width:640px;border-inline-end:24px solid #444"
>
  <div style="display:flex;justify-content:flex-end;padding-inline-end:{inset}px;padding-top:8px">
    <div style="width:144px">
      <DatePicker id="edge" label="To" value="2026-11-25" />
    </div>
  </div>
  <div style="height:900px"></div>
</div>
