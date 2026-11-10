import { describe, expect, it } from 'vitest';

import {
  CONTROL_BASE,
  CONTROL_MULTILINE,
  CONTROL_SEGMENT,
  CONTROL_SEGMENTED,
  countFields,
} from './field';

// theme.css declares a global :focus-visible outline, chosen for its contrast,
// and a utility beats the base layer. outline-none without a replacement
// therefore leaves a control with no focus indicator at all beyond a 1px
// border-color change, which is what CONTROL_BASE and CONTROL_MULTILINE
// shipped: every text input, textarea, number and select in the kit.
// CONTROL_SEGMENT and SidebarNav's buttons already pair the two correctly.
describe('control bases keep a focus indicator', () => {
  const bases = { CONTROL_BASE, CONTROL_MULTILINE, CONTROL_SEGMENT };

  for (const [name, cls] of Object.entries(bases)) {
    it(`${name} pairs outline-none with a focus ring`, () => {
      if (!cls.includes('outline-none')) return;
      expect(cls, `${name} silences the outline`).toContain('focus-visible:ring-2');
      expect(cls, `${name} names a ring color`).toMatch(/focus-visible:ring-focus(\/50)?(\s|$)/);
    });
  }
});

// A focused field showed a brand border, a full brand ring inside it and a
// glow outside it, which read as 3px of glare. The border is the indicator
// that clears 3:1, so the ring beside it is the focus color at half strength
// and nothing glows.
describe('a focused field', () => {
  const classes = (cls: string) => cls.split(/\s+/);

  for (const [name, cls] of Object.entries({ CONTROL_BASE, CONTROL_MULTILINE })) {
    it(`${name} draws a half-strength ring and no glow`, () => {
      expect(classes(cls)).toContain('focus-visible:ring-focus/50');
      expect(classes(cls)).not.toContain('focus-visible:ring-focus');
      expect(cls).not.toMatch(/shadow-glow/);
    });
  }

  it('keeps the focus ring on a segment, where nothing else marks focus', () => {
    expect(classes(CONTROL_SEGMENT)).toContain('focus-visible:ring-focus');
  });

  it('puts no glow on a segmented wrapper', () => {
    expect(CONTROL_SEGMENTED).not.toMatch(/shadow-glow/);
  });
});

describe('countFields', () => {
  /** Builds a detached tree from markup, the way a panel body arrives. */
  const body = (html: string) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    return root;
  };

  it('counts nothing in a body that holds no form', () => {
    expect(countFields(body('<p>Delete this tenant?</p>'))).toBe(0);
  });

  it('counts each labeled field once', () => {
    expect(countFields(body('<div data-field></div>'.repeat(6)))).toBe(6);
  });

  it('counts a group of options as the one question it asks', () => {
    // Every option marks its own wrapper, so a plain querySelectorAll would
    // read a five-option group as six fields and size the panel around it.
    const group = `<fieldset data-field>${'<div data-field></div>'.repeat(5)}</fieldset>`;
    expect(countFields(body(group))).toBe(1);
  });

  it('counts a group beside a field as two', () => {
    const markup = `<fieldset data-field><div data-field></div></fieldset><div data-field></div>`;
    expect(countFields(body(markup))).toBe(2);
  });

  it('counts a field nested in a layout, which is where a form puts its pairs', () => {
    const paired = `<div class="grid">${'<div data-field></div>'.repeat(2)}</div>`;
    expect(countFields(body(paired))).toBe(2);
  });
});
