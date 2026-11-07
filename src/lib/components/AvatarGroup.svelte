<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { AVATAR_SIZE } from '../internal/avatar.js';

  type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

  interface User {
    name: string;
    src?: string;
  }

  interface Props {
    users: User[];
    /** How many avatars show. The rest collapse into one "+n" chip. */
    max?: number;
    size?: AvatarSize;
    class?: string;
  }

  let { users, max = 4, size = 'sm', class: cls = '' }: Props = $props();

  let visible = $derived(users.slice(0, max));
  let overflow = $derived(users.length - max);
</script>

<div class="flex items-center {cls}">
  {#each visible as user}
    <span class="-ms-1.5 inline-block rounded-full ring-2 ring-ink first:ms-0">
      <Avatar name={user.name} src={user.src} {size} />
    </span>
  {/each}

  {#if overflow > 0}
    <span
      class="-ms-1.5 inline-flex shrink-0 items-center justify-center rounded-full
        bg-surface-2 font-semibold text-faint ring-2 ring-ink
        {AVATAR_SIZE[size].wrap} {AVATAR_SIZE[size].text}">+{overflow}</span
    >
  {/if}
</div>
