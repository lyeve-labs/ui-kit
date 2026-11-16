<script lang="ts">
  // Every variant idle, loading and disabled, side by side, so a test compares
  // what a loading button draws with what the other two draw.
  import Button from '../../src/lib/components/Button.svelte';

  const variants = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'] as const;
</script>

<div class="bg-ink flex flex-col gap-4 p-6">
  {#each variants as variant (variant)}
    <div class="flex items-start gap-2">
      <Button {variant} data-testid="{variant}-idle">Save</Button>
      <Button {variant} loading data-testid="{variant}-loading">Save</Button>
      <Button {variant} disabled data-testid="{variant}-disabled">Save</Button>
    </div>
  {/each}
</div>
