<script lang="ts">
  // The shell at a width where the sidebar is the rail, with a toolbar button
  // at the start of the page, which is where the open column lands.
  import { Database, LayoutDashboard, Settings } from '@lucide/svelte';
  import AppShell from '../../src/lib/components/AppShell.svelte';
  import Button from '../../src/lib/components/Button.svelte';
  import SidebarNav from '../../src/lib/components/SidebarNav.svelte';
  import type { NavTree } from '../../src/lib/internal/nav-tree.js';

  const items: NavTree = [
    { id: 'dashboard', label: 'Dashboard', href: '#dashboard', icon: LayoutDashboard },
    { id: 'schemas', label: 'Schemas', href: '#schemas', icon: Database },
    { id: 'settings', label: 'Settings', href: '#settings', icon: Settings },
  ];

  let created = $state(0);
</script>

<AppShell section="Schemas">
  {#snippet nav({ rail })}
    <SidebarNav class="min-h-0 flex-1" {items} activePath="#schemas" collapsed={rail} />
  {/snippet}
  <Button onclick={() => created++}>New schema</Button>
  <p data-testid="created">{created}</p>
</AppShell>
