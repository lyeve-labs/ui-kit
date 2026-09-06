import { describe, expect, it } from 'vitest';

import { CONTROL_BASE, CONTROL_MULTILINE, CONTROL_SEGMENT } from './field';

// theme.css declares a global :focus-visible outline, chosen for its contrast,
// and a utility beats the base layer. outline-none without a replacement
// therefore leaves a control with no focus indicator at all beyond a 1px
// border-colour change, which is what CONTROL_BASE and CONTROL_MULTILINE
// shipped: every text input, textarea, number and select in the kit.
// CONTROL_SEGMENT and SidebarNav's buttons already pair the two correctly.
describe('control bases keep a focus indicator', () => {
	const bases = { CONTROL_BASE, CONTROL_MULTILINE, CONTROL_SEGMENT };

	for (const [name, cls] of Object.entries(bases)) {
		it(`${name} pairs outline-none with a focus ring`, () => {
			if (!cls.includes('outline-none')) return;
			expect(cls, `${name} silences the outline`).toContain('focus-visible:ring-2');
			expect(cls, `${name} names a ring colour`).toContain('focus-visible:ring-brand');
		});
	}
});
