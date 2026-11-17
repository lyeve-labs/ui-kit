<script lang="ts">
  // A formatting row as an editor draws it: ghost toggles, one of them on, a
  // disabled button between them and a menu of checkbox rows, with a control
  // on each side so a spec can Tab into the row and out of it.
  import { Bold, Italic, Link, Redo, Underline } from '@lucide/svelte';
  import Button from '../../src/lib/components/Button.svelte';
  import Dropdown from '../../src/lib/components/Dropdown.svelte';
  import Toolbar from '../../src/lib/components/Toolbar.svelte';

  let bold = $state(true);
  let italic = $state(false);
  let wrap = $state(true);
  let redos = $state(1);
</script>

<div class="flex items-center gap-4 bg-ink p-6">
  <button type="button">Before</button>
  <div class="rounded-lg bg-surface p-0.5" data-testid="surface">
    <Toolbar label="Text formatting" roving tight>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bold"
        aria-pressed={bold ? 'true' : 'false'}
        onclick={() => (bold = !bold)}><Bold size={16} /></Button
      >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Italic"
        aria-pressed={italic ? 'true' : 'false'}
        onclick={() => (italic = !italic)}><Italic size={16} /></Button
      >
      <Button variant="ghost" size="icon" aria-label="Underline" disabled
        ><Underline size={16} /></Button
      >
      <Button variant="ghost" size="icon" aria-label="Add link"><Link size={16} /></Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Redo"
        disabled={redos === 0}
        onclick={() => (redos -= 1)}><Redo size={16} /></Button
      >
      <Dropdown
        items={[
          { label: 'Wrap lines', checked: wrap, onclick: () => (wrap = !wrap) },
          { label: 'Clear formatting', onclick: () => {} },
        ]}
      >
        {#snippet trigger({ toggle })}
          <Button variant="ghost" size="sm" onclick={toggle}>More</Button>
        {/snippet}
      </Dropdown>
    </Toolbar>
  </div>
  <button type="button">After</button>
</div>
