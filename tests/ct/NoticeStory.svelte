<script lang="ts">
  // Every state each notice draws, on one page, with words a console would pass.
  import Alert from '../../src/lib/components/Alert.svelte';
  import Button from '../../src/lib/components/Button.svelte';
  import GateNotice from '../../src/lib/components/GateNotice.svelte';
  import RefusalNotice from '../../src/lib/components/RefusalNotice.svelte';
  import type { Gate, GateWords } from '../../src/lib/internal/gate.js';

  let { part }: { part: 'refusal' | 'gate' } = $props();

  const words: GateWords = {
    absent: 'Reports are not part of this build, so there is nothing to show.',
    full: { title: 'Reports are at their limit', body: '12 of 12 are in use.' },
    forbidden: 'Your role cannot open reports. Ask an administrator if you need them.',
    busy: { title: 'Too many requests', body: 'Wait a moment, then try again.' },
    unavailable: {
      title: 'Temporarily unavailable',
      body: 'The server did not answer, so reports could not be read. Nothing was changed.',
    },
    retry: 'Try again',
  };

  const gates: Gate[] = [
    { state: 'absent' },
    { state: 'locked', forwardHref: '/settings/reports' },
    { state: 'full', limit: 12, current: 12, forwardHref: '' },
    { state: 'forbidden' },
    { state: 'busy' },
    { state: 'unavailable' },
    { state: 'error', message: 'The reports could not be read.' },
  ];
  const link = { href: '/settings', label: 'Open settings' };
  const forward = { href: '/reports?view=archive', label: 'Archive old reports' };
</script>

{#snippet locked(href: string)}
  <Alert tone="brand">
    <p>Reports are not turned on here.</p>
    <Button variant="secondary" size="sm" {href}>How to turn them on</Button>
  </Alert>
{/snippet}

<main class="flex flex-col gap-4 p-4">
  {#if part === 'refusal'}
    <RefusalNotice title="Reports are at their limit" body="12 of 12 are in use." {link} />
    <RefusalNotice
      title="Reports are at their limit"
      body="12 of 12 are in use."
      {forward}
      {link}
    />
    <RefusalNotice
      title="Reports are at their limit"
      body="12 of 12 are in use."
      {forward}
      {link}
      lead
    />
  {:else}
    {#each gates as gate (gate.state)}
      <GateNotice {gate} {words} {locked} retryHref="/reports" />
    {/each}
  {/if}
</main>
