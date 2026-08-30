<script lang="ts">
  import { Moon, Sun } from '@lucide/svelte';
  import { getTheme, toggleTheme, type Theme } from '../utils/theme.js';

  interface Props {
    class?: string;
  }

  let { class: klass = '' }: Props = $props();

  let theme = $state<Theme>('dark');

  $effect(() => {
    theme = getTheme();
  });

  function flip() {
    theme = toggleTheme();
  }
</script>

<button
  type="button"
  onclick={flip}
  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  class="rounded-lg p-2 text-faint transition-colors duration-150 hover:bg-surface-2 hover:text-fg {klass}"
>
  {#if theme === 'dark'}
    <Sun size={16} aria-hidden="true" />
  {:else}
    <Moon size={16} aria-hidden="true" />
  {/if}
</button>
