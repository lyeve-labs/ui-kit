<script lang="ts">
  /**
   * The line under a field: the error when there is one, else the hint. The ids
   * are `<base>-error` and `<base>-hint`, the ones `describedBy` points the
   * control at.
   */
  import { FIELD_ERROR, FIELD_HINT } from './field.js';

  interface Props {
    base: string;
    error?: string;
    hint?: string;
    class?: string;
  }

  let { base, error = undefined, hint = undefined, class: klass = '' }: Props = $props();
</script>

{#if error}
  <p id="{base}-error" class={klass ? `${FIELD_ERROR} ${klass}` : FIELD_ERROR}>{error}</p>
{:else if hint}
  <p id="{base}-hint" class={klass ? `${FIELD_HINT} ${klass}` : FIELD_HINT}>{hint}</p>
{/if}
