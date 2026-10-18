<script lang="ts">
  import { RefreshCw } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Alert from './Alert.svelte';
  import Button from './Button.svelte';
  import type { Gate, GateWords } from '../internal/gate.js';

  /**
   * What a page shows in place of what a refused or failed read would have
   * filled, the same way on every page. The page passes the gate it mapped
   * from the server's answer and every sentence in its own words. Only the
   * states that waiting can change offer to try again.
   */
  interface Props {
    gate: Gate;
    words: GateWords;
    /** Drawn for a feature that is not enabled, given the link the gate carried. */
    locked: Snippet<[upgradeUrl: string]>;
    /** The address that asks for this page again, usually its own path and query. */
    retryHref: string;
    class?: string;
  }

  let { gate, words, locked, retryHref, class: klass = '' }: Props = $props();
</script>

{#snippet retry()}
  <div class="mt-3">
    <!-- A plain link works before the page hydrates. After it hydrates, a
         SvelteKit router keeps the data it holds for an address that did not
         change, so the link asks for a fresh document instead. Other hosts
         ignore the attribute. -->
    <Button variant="secondary" size="sm" href={retryHref} data-sveltekit-reload>
      <RefreshCw size={14} aria-hidden="true" />
      {words.retry}
    </Button>
  </div>
{/snippet}

{#if gate.state !== 'ok'}
  <div class={klass} data-testid="gate-notice" data-state={gate.state}>
    {#if gate.state === 'absent'}
      <Alert tone="brand">{words.absent}</Alert>
    {:else if gate.state === 'locked'}
      {@render locked(gate.upgradeUrl)}
    {:else if gate.state === 'full'}
      <Alert tone="warn" title={words.full.title}>{words.full.body}</Alert>
    {:else if gate.state === 'forbidden'}
      <!-- Trying again cannot change a role, so this one offers nothing to press. -->
      <Alert tone="warn">{words.forbidden}</Alert>
    {:else if gate.state === 'busy'}
      <Alert tone="warn" title={words.busy.title}>
        <p>{words.busy.body}</p>
        {@render retry()}
      </Alert>
    {:else if gate.state === 'unavailable'}
      <Alert tone="warn" title={words.unavailable.title}>
        <p>{words.unavailable.body}</p>
        {@render retry()}
      </Alert>
    {:else if gate.state === 'error'}
      <Alert tone="danger">
        <p>{gate.message}</p>
        {@render retry()}
      </Alert>
    {/if}
  </div>
{/if}
