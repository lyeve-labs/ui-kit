<script lang="ts">
  /* One control, or a custom one, inside a FormAssist, for the per-control cases. */
  import type { Component } from 'svelte';
  import { FormAssist } from '../../src/lib/index.js';

  interface Props {
    control: Component<any>;
    props: Record<string, unknown>;
  }

  let { control: Control, props }: Props = $props();
</script>

<form>
  <FormAssist label="One">
    <Control {...props} />
  </FormAssist>
</form>
