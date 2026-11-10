<script lang="ts">
  // Every field a person types into or opens, at rest, so one test can focus
  // each and read the edge it draws.
  import Autocomplete from '../../src/lib/components/Autocomplete.svelte';
  import ColorField from '../../src/lib/components/ColorField.svelte';
  import CopyField from '../../src/lib/components/CopyField.svelte';
  import DatePicker from '../../src/lib/components/DatePicker.svelte';
  import Input from '../../src/lib/components/Input.svelte';
  import MultiSelect from '../../src/lib/components/MultiSelect.svelte';
  import NumberInput from '../../src/lib/components/NumberInput.svelte';
  import PasswordInput from '../../src/lib/components/PasswordInput.svelte';
  import SearchInput from '../../src/lib/components/SearchInput.svelte';
  import Select from '../../src/lib/components/Select.svelte';
  import Textarea from '../../src/lib/components/Textarea.svelte';

  const options = [
    { value: 'featured', label: 'Featured' },
    { value: 'price', label: 'Price, low to high' },
    { value: 'name', label: 'Name, A to Z' },
  ];
</script>

<div style="padding: 16px; display: grid; gap: 16px; width: 360px">
  <Input label="Name" />
  <Textarea label="Notes" />
  <PasswordInput label="Password" />
  <SearchInput label="Search posts" />
  <NumberInput label="Hours" value={1} />
  <Select label="Sort" {options} value="featured" searchable />
  <Autocomplete label="Country" {options} />
  <DatePicker label="Starts on" />
  <ColorField label="Accent" />
  <MultiSelect label="Tags" {options} />
  <CopyField label="Key" value="lyv_live_4f2a9c" />
</div>
