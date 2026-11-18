<script lang="ts">
  // The shell as a console mounts it: a collapse control in the header, and a
  // page that asks for the rail and puts the header away, as an editor route
  // does.
  import { Database, LayoutDashboard, Settings } from '@lucide/svelte';
  import AppShell from '../../src/lib/components/AppShell.svelte';
  import SidebarNav from '../../src/lib/components/SidebarNav.svelte';
  import type { NavTree } from '../../src/lib/internal/nav-tree.js';

  const items: NavTree = [
    { id: 'dashboard', label: 'Dashboard', href: '#dashboard', icon: LayoutDashboard },
    { id: 'schemas', label: 'Schemas', href: '#schemas', icon: Database },
    { id: 'settings', label: 'Settings', href: '#settings', icon: Settings },
  ];

  let {
    collapsed: start = false,
    headerHidden: hiddenAtStart = false,
    paintFirst = false,
  }: { collapsed?: boolean; headerHidden?: boolean; paintFirst?: boolean } = $props();
  // A browser draws a server-rendered page before it hydrates, so the shell's
  // first state has its style computed before the shell's effects read the
  // window. This effect runs before the shell's and reads the layout the same
  // way.
  $effect(() => {
    if (paintFirst) void document.body.offsetHeight;
  });
  let collapsed = $state(start);
  let rail = $state(false);
  let headerHidden = $state(hiddenAtStart);
</script>

<AppShell section="Schemas" collapsible bind:collapsed {rail} {headerHidden}>
  {#snippet nav({ rail })}
    <SidebarNav
      class="min-h-0 w-full flex-1 px-inline"
      {items}
      activePath="#schemas"
      collapsed={rail}
    />
  {/snippet}
  <button type="button" data-testid="ask-rail" onclick={() => (rail = !rail)}>Rail</button>
  <button type="button" data-testid="ask-header" onclick={() => (headerHidden = !headerHidden)}
    >Header</button
  >
</AppShell>
