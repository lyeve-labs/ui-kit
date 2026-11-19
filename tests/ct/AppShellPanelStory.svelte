<script lang="ts">
  // The shell with a docked side panel, as a console mounts it: the panel's
  // open state comes either from the props or from a choice the page reads
  // back after mount, such as one kept in storage.
  import { Database, LayoutDashboard } from '@lucide/svelte';
  import AppShell from '../../src/lib/components/AppShell.svelte';
  import SidebarNav from '../../src/lib/components/SidebarNav.svelte';
  import type { NavTree } from '../../src/lib/internal/nav-tree.js';

  const items: NavTree = [
    { id: 'dashboard', label: 'Dashboard', href: '#dashboard', icon: LayoutDashboard },
    { id: 'schemas', label: 'Schemas', href: '#schemas', icon: Database },
  ];

  let { open = false, openAfterMount = false }: { open?: boolean; openAfterMount?: boolean } =
    $props();
  let panelOpen = $state(open);
  $effect(() => {
    if (openAfterMount) panelOpen = true;
  });
</script>

<AppShell section="Schemas" bind:panelOpen panelLabel="Assistant">
  {#snippet nav({ rail })}
    <SidebarNav class="min-h-0 w-full flex-1" {items} activePath="#schemas" collapsed={rail} />
  {/snippet}
  {#snippet panel()}
    <p>Ask about this page.</p>
  {/snippet}
  <button type="button" data-testid="toggle-panel" onclick={() => (panelOpen = !panelOpen)}>
    Panel
  </button>
</AppShell>
