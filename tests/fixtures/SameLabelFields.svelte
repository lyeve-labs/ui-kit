<script lang="ts">
  /*
   * One page holding two of each field that takes a label, every pair under
   * one label and none given an id: a billing and a shipping address that both
   * ask for a name.
   */
  import { Input, NumberInput, SearchInput, Select, Textarea } from '../../src/lib/index.js';

  const options = [{ value: 'a', label: 'Alpha' }];
</script>

<Input label="Name" hint="As on the card" />
<Input label="Name" error="Required" />
<Textarea label="Notes" hint="Optional" />
<Textarea label="Notes" error="Too long" />
<NumberInput label="Quantity" hint="Whole numbers" />
<NumberInput label="Quantity" error="Too many" />
<SearchInput label="Find" />
<SearchInput label="Find" />
<Select label="Plan" {options} hint="Billed monthly" />
<Select label="Plan" {options} error="Pick a plan" />
