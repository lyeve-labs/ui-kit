<script lang="ts">
  // Each control that can be disabled or loading, beside an enabled one of the
  // same kind, so a test hovers both and compares what each draws.
  import AccountMenuItem from '../../src/lib/components/AccountMenuItem.svelte';
  import Button from '../../src/lib/components/Button.svelte';
  import DatePicker from '../../src/lib/components/DatePicker.svelte';
  import Dropdown from '../../src/lib/components/Dropdown.svelte';
  import FileInput from '../../src/lib/components/FileInput.svelte';
  import Input from '../../src/lib/components/Input.svelte';
  import MultiSelect from '../../src/lib/components/MultiSelect.svelte';
  import NumberInput from '../../src/lib/components/NumberInput.svelte';
  import Pagination from '../../src/lib/components/Pagination.svelte';
  import SegmentedControl from '../../src/lib/components/SegmentedControl.svelte';
  import Select from '../../src/lib/components/Select.svelte';
  import TimePicker from '../../src/lib/components/TimePicker.svelte';

  const variants = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'] as const;
  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
  ];
  const themes = (href: boolean) => [
    { value: 'light', label: 'Light', href: href ? '?theme=light' : undefined },
    { value: 'dark', label: 'Dark', href: href ? '?theme=dark' : undefined },
  ];
  const items = [
    { label: 'Rename', onclick: () => {} },
    { label: 'Archive', disabled: true, onclick: () => {} },
  ];
</script>

<div class="bg-ink flex flex-col items-start gap-4 p-6">
  {#each variants as variant (variant)}
    <div class="flex gap-2">
      <Button {variant} data-testid="button-{variant}-idle">Save</Button>
      <Button {variant} loading data-testid="button-{variant}-loading">Save</Button>
      <Button {variant} disabled data-testid="button-{variant}-disabled">Save</Button>
    </div>
  {/each}

  <div data-testid="pagination">
    <Pagination page={1} total={50} perPage={10} onchange={() => {}} />
  </div>

  {#each [false, true] as href (href)}
    {#each [false, true] as disabled (disabled)}
      <div data-testid="segments-{href ? 'link' : 'radio'}-{disabled ? 'disabled' : 'enabled'}">
        <SegmentedControl label="Theme" value="dark" options={themes(href)} {disabled} />
      </div>
    {/each}
  {/each}

  <div class="w-64 bg-surface p-2">
    <div data-testid="account-idle"><AccountMenuItem>Sign out</AccountMenuItem></div>
    <div data-testid="account-loading"><AccountMenuItem loading>Sign out</AccountMenuItem></div>
  </div>

  <div data-testid="dropdown">
    <Dropdown {items} align="left">
      {#snippet trigger({ toggle })}
        <button type="button" onclick={toggle}>Actions</button>
      {/snippet}
    </Dropdown>
  </div>

  <div data-testid="date" class="w-64">
    <DatePicker label="Starts" value="2027-11-09" min="2027-11-05" />
  </div>

  {#each [false, true] as disabled (disabled)}
    {@const state = disabled ? 'disabled' : 'enabled'}
    <div class="flex w-80 flex-col gap-2">
      <div data-testid="input-{state}"><Input label="Title" value="Hello" {disabled} /></div>
      <div data-testid="select-{state}">
        <Select label="Role" options={roles} value="admin" {disabled} />
      </div>
      <div data-testid="multi-{state}">
        <MultiSelect label="Roles" options={roles} value={['admin']} {disabled} />
      </div>
      <div data-testid="time-{state}"><TimePicker label="Time" value="10:30" {disabled} /></div>
      <div data-testid="number-{state}">
        <NumberInput label="Limit" value={3} min={0} max={9} {disabled} />
      </div>
      <div data-testid="file-{state}"><FileInput label="File" {disabled} /></div>
    </div>
  {/each}
</div>
