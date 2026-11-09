<script lang="ts">
  /*
   * A control the kit does not ship, registering the way the kit's own do:
   * through assistField, with its own markup for the suggested state.
   */
  import { assistField } from '../../src/lib/index.js';

  interface Props {
    name: string;
    label: string;
    value?: string;
  }

  let { name, label, value = $bindable('') }: Props = $props();

  const assist = assistField({
    get name() {
      return name;
    },
    get label() {
      return label;
    },
    kind: 'text',
    accepts: (v) => /^[a-z0-9-]+$/.test(String(v)),
    get value() {
      return value;
    },
    set value(v) {
      value = v as string;
    },
  });
</script>

<label>
  {label}
  <input {name} bind:value data-suggested={assist.pending ? '' : undefined} />
</label>
{#if assist.pending}
  <button type="button" onclick={() => assist.accept()}>Keep the slug</button>
{/if}
