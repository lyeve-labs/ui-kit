<script lang="ts">
  /**
   * A control's label line, which gains the accept and reject buttons while
   * the field holds a suggestion. Without one it renders the line alone, so a
   * control outside a FormAssist draws what it always drew.
   */
  import type { Snippet } from 'svelte';
  import AssistActions from './AssistActions.svelte';
  import type { AssistField } from './assist.svelte.js';

  interface Props {
    field: AssistField;
    children: Snippet;
  }

  let { field, children }: Props = $props();
</script>

{#if field.pending}
  <div class="flex items-center gap-2">
    {@render children()}
    <AssistActions {field} />
  </div>
{:else}
  {@render children()}
{/if}
