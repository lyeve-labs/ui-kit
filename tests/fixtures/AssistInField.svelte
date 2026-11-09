<script lang="ts">
  /* Controls named by something other than their own label. */
  import { Field, FormAssist, Input } from '../../src/lib/index.js';
</script>

<form>
  <FormAssist label="Unlabeled">
    <Field label="Title">
      {#snippet children(wiring)}
        <Input id={wiring.id} name="title" />
      {/snippet}
    </Field>
    <Input name="query" aria-label="Search" />
    <Input name="slug" />
  </FormAssist>
</form>
