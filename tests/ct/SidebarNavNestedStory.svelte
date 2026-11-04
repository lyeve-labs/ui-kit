<script lang="ts">
  // A section whose child is the current page, with a sibling for the pointer
  // to rest on and one at rest, the shape a console sidebar takes.
  import { FlaskConical, LayoutDashboard, ShoppingCart, UserMinus, Users } from '@lucide/svelte';
  import SidebarNav from '../../src/lib/components/SidebarNav.svelte';
  import type { NavTree } from '../../src/lib/internal/nav-tree.js';

  interface Props {
    activePath: string;
    collapsed?: boolean;
  }

  let { activePath, collapsed = false }: Props = $props();

  const items: NavTree = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      id: 'customers',
      label: 'Customers',
      href: '/customers',
      icon: Users,
      children: [
        {
          id: 'deletions',
          label: 'Deletion requests',
          href: '/customers/deletions',
          icon: UserMinus,
        },
        { id: 'qa', label: 'QA accounts', href: '/customers/qa', icon: FlaskConical },
        { id: 'checkouts', label: 'Checkouts', href: '/customers/checkouts', icon: ShoppingCart },
      ],
    },
  ];
</script>

<div class="bg-surface p-2" data-testid="frame">
  <SidebarNav {items} {activePath} {collapsed} />
</div>
