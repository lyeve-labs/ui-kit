<script lang="ts">
  /*
   * A form wrapped in a FormAssist with one of each representative control,
   * and a submit listener on the form the way use:enhance attaches one.
   */
  import {
    Checkbox,
    FormAssist,
    Input,
    NumberInput,
    PasswordInput,
    RadioGroup,
    Select,
  } from '../../src/lib/index.js';

  interface Props {
    onsubmit?: (event: SubmitEvent) => void;
  }

  let { onsubmit = () => {} }: Props = $props();

  const roles = [
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ];
  const plans = [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
  ];

  let name = $state('');
  let role = $state<string | null>(null);
  let active = $state(false);
  let plan = $state('free');
  let limit = $state(10);
  let secret = $state('s3cret');
  let note = $state('private');
  let form: HTMLFormElement | undefined = $state();

  $effect(() => {
    if (!form) return;
    const listener = (event: Event) => onsubmit(event as SubmitEvent);
    form.addEventListener('submit', listener);
    return () => form?.removeEventListener('submit', listener);
  });
</script>

<form bind:this={form} method="POST">
  <FormAssist label="New key">
    <Input name="name" label="Name" hint="Letters and dashes." required bind:value={name} />
    <Select name="role" label="Role" options={roles} bind:value={role} />
    <Checkbox name="active" label="Active" bind:checked={active} />
    <RadioGroup name="plan" label="Plan" options={plans} bind:value={plan} />
    <NumberInput name="limit" label="Limit" min={0} max={100} bind:value={limit} />
    <PasswordInput name="secret" label="Secret" bind:value={secret} />
    <Input name="note" label="Note" noAI bind:value={note} />
  </FormAssist>
  <button type="submit">Create</button>
</form>
