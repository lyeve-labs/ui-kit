<script lang="ts">
  // The shell held to the icon rail at every width above a phone, the way a
  // full-screen editor holds it: a mark in the brand row, eight entries, and
  // the second one current. `navClass` is what the app passes the nav, so a
  // case can draw it bare or with the classes every console passes. The
  // `sections` variant holds a section with no link of its own and a link
  // that is also a section, with the current page inside the first.
  import {
    Blocks,
    FileCode,
    FileText,
    GitCompareArrows,
    Globe,
    History,
    Palette,
    Settings,
  } from '@lucide/svelte';
  import AppShell from '../../src/lib/components/AppShell.svelte';
  import Logo from '../../src/lib/components/Logo.svelte';
  import SidebarNav from '../../src/lib/components/SidebarNav.svelte';
  import type { NavTree } from '../../src/lib/internal/nav-tree.js';

  let { navClass = '', variant = 'flat' }: { navClass?: string; variant?: 'flat' | 'sections' } =
    $props();

  const flat: NavTree = [
    { id: 'sites', label: 'Sites', href: '#sites', icon: Globe },
    { id: 'pages', label: 'Pages', href: '#pages', icon: FileText },
    { id: 'sections', label: 'Sections', href: '#sections', icon: Blocks },
    { id: 'theme', label: 'Theme', href: '#theme', icon: Palette },
    { id: 'stylesheet', label: 'Stylesheet', href: '#stylesheet', icon: FileCode },
    { id: 'changes', label: 'Changes', href: '#changes', icon: GitCompareArrows },
    { id: 'history', label: 'History', href: '#history', icon: History },
    { id: 'settings', label: 'Settings', href: '#settings', icon: Settings },
  ];

  const sections: NavTree = [
    { id: 'sites', label: 'Sites', href: '#sites', icon: Globe },
    {
      id: 'content',
      label: 'Content',
      icon: Blocks,
      children: [
        { id: 'pages', label: 'Pages', href: '#pages', icon: FileText },
        { id: 'sections', label: 'Sections', href: '#sections', icon: Blocks },
      ],
    },
    {
      id: 'theme',
      label: 'Theme',
      href: '#theme',
      icon: Palette,
      children: [{ id: 'stylesheet', label: 'Stylesheet', href: '#stylesheet', icon: FileCode }],
    },
    { id: 'settings', label: 'Settings', href: '#settings', icon: Settings },
  ];

  const items = $derived(variant === 'sections' ? sections : flat);
</script>

<AppShell sidebarLabel="Sidebar" rail section="Pages">
  {#snippet brand({ rail })}
    <a
      href="#home"
      aria-label="Home"
      class="relative hit-area inline-flex items-center gap-2 rounded-lg py-1 {rail ? '' : 'px-2'}"
    >
      <Logo wordmark={!rail} />
    </a>
  {/snippet}
  {#snippet nav({ rail })}
    <SidebarNav class={navClass} {items} activePath="#pages" collapsed={rail} />
  {/snippet}
  <p>Page</p>
</AppShell>
