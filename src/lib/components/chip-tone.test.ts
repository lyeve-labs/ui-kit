import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { CHIP_TONE, type AccentTone } from '../internal/tone.js';
import Badge from './Badge.svelte';
import Tag from './Tag.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));
const TONES = Object.keys(CHIP_TONE) as AccentTone[];

/** Badge and Tag draw one chip, so each tone is asserted once over both. */
describe.each([
  ['Badge', (tone?: AccentTone) => render(Badge, { props: { children: text('x'), tone } })],
  ['Tag', (tone?: AccentTone) => render(Tag, { props: { label: 'x', tone } })],
])('%s', (_, draw) => {
  it.each(TONES)('applies the %s tone', (tone) => {
    const chip = draw(tone).container.firstElementChild as HTMLElement;
    for (const c of CHIP_TONE[tone].split(' ')) expect(chip.classList).toContain(c);
  });

  it('is neutral by default', () => {
    const chip = draw().container.firstElementChild as HTMLElement;
    for (const c of CHIP_TONE.neutral.split(' ')) expect(chip.classList).toContain(c);
  });
});
