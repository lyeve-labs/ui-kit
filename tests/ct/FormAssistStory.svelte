<script lang="ts">
  // The registry lives in the page. A spec runs in Node and holds its own copy
  // of the module, so the suggestion is made here, inside the page.
  import FormAssist from '../../src/lib/components/FormAssist.svelte';
  import Input from '../../src/lib/components/Input.svelte';
  import { assistForms } from '../../src/lib/internal/assist.svelte.js';

  let name = $state('');
  const suggest = () => assistForms()[0]?.suggest({ name: 'release-key' });
</script>

<form>
  <FormAssist label="New key">
    <Input name="name" label="Name" bind:value={name} />
  </FormAssist>
</form>
<button type="button" onclick={suggest}>Suggest</button>
