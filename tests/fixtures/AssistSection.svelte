<script lang="ts">
  /*
   * A field inside a section that comes and goes, the way a tab or a closed
   * part of a form does, with the page's own value shown beside it. Beside it
   * sits a form of its own, such as a search, that is not the form assisted.
   */
  import { FormAssist, Input } from '../../src/lib/index.js';

  interface Props {
    show?: boolean;
    outer?: boolean;
  }

  let { show = true, outer = true }: Props = $props();

  let title = $state('Old');
</script>

{#snippet fields()}
  <FormAssist label="Section">
    {#if show}
      <Input name="title" label="Title" bind:value={title} />
    {/if}
    <form data-testid="search"><button type="submit">Search</button></form>
  </FormAssist>
{/snippet}

{#if outer}
  <form data-testid="outer">{@render fields()}</form>
{:else}
  {@render fields()}
{/if}
<output data-testid="title">{title}</output>
