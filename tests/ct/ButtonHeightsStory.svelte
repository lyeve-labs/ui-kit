<script lang="ts">
  // Every variant at every size in one row each, so a test reads the heights
  // a reader sees side by side.
  import Button from '../../src/lib/components/Button.svelte';
  import Input from '../../src/lib/components/Input.svelte';

  const variants = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'] as const;
  const sizes = ['sm', 'md', 'lg'] as const;
</script>

<div class="bg-ink flex flex-col gap-4 p-6">
  {#each sizes as size (size)}
    <div class="flex items-start gap-2">
      {#each variants as variant (variant)}
        <Button {variant} {size} hint={false} data-testid="{size}-{variant}">Save</Button>
      {/each}
    </div>
  {/each}
  <div class="flex items-start gap-2">
    {#each variants as variant (variant)}
      <Button {variant} size="icon" aria-label="Open" hint={false} data-testid="icon-{variant}">
        <svg width="16" height="16" aria-hidden="true"></svg>
      </Button>
    {/each}
  </div>
  <div class="w-64" data-testid="input"><Input label="Name" /></div>
</div>
