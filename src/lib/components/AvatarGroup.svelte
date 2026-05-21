<script lang="ts">
  import Avatar from './Avatar.svelte';

  type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

  interface User {
    name: string;
    src?: string;
  }

  interface Props {
    users: User[];
    max?: number;
    size?: AvatarSize;
    class?: string;
  }

  let { users, max = 4, size = 'sm', class: cls = '' }: Props = $props();

  let visible = $derived(users.slice(0, max));
  let overflow = $derived(users.length - max);

  const overflowSizes: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };
</script>

<div class="flex items-center {cls}">
  {#each visible as user}
    <span class="-ml-1.5 inline-block rounded-full ring-2 ring-ink first:ml-0">
      <Avatar name={user.name} src={user.src} {size} />
    </span>
  {/each}

  {#if overflow > 0}
    <span
      class="-ml-1.5 inline-flex shrink-0 items-center justify-center rounded-full
        bg-surface-2 font-semibold text-faint ring-2 ring-ink
        {overflowSizes[size]}">+{overflow}</span
    >
  {/if}
</div>
