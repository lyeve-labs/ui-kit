import { describe, expect, it } from 'vitest';

import {
  CONTROL_BASE,
  CONTROL_MULTILINE,
  CONTROL_SEGMENT,
  CONTROL_SEGMENTED,
  FRAME_HOVER,
  controlBorder,
  countFields,
  segmentedBorder,
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
      expect(cls, `${name} silences the outline`).toMatch(/focus-visible:ring-[12](\s|$)/);
    });
  }
});

// A focused field showed a brand border with a half-strength ring inside it,
// which read as two lines, one inside the other. The border turns the focus
// color and a 1px inset ring repeats it, so focus is one 2px edge in one
// color, and nothing glows.
describe('a focused field', () => {
  const classes = (cls: string) => cls.split(/\s+/);

  for (const [name, cls] of Object.entries({ CONTROL_BASE, CONTROL_MULTILINE })) {
    it(`${name} draws a 1px inset ring and no glow`, () => {
      expect(classes(cls)).toContain('focus-visible:ring-1');
      expect(classes(cls)).toContain('focus-visible:ring-inset');
      expect(cls).not.toMatch(/ring-2|ring-focus\/|shadow-glow/);
    });
  }

  it.each([
    { state: 'at rest', border: controlBorder(false), color: 'focus' },
    { state: 'in error', border: controlBorder(true), color: 'danger' },
    { state: 'holding a suggestion', border: controlBorder(false, true), color: 'violet' },
  ])('colors the ring as the focused border $state', ({ border, color }) => {
    expect(classes(border)).toContain(`focus:border-${color}`);
    expect(classes(border)).toContain(`focus-visible:ring-${color}`);
  });

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

describe('field borders', () => {
  const tokens = (classes: string) => classes.split(/\s+/);

  it('rests every field on the soft line and firms it under the pointer', () => {
    // line-strong drew a gray frame round every field on the navy grounds.
    // The label, the fill and the placeholder or value mark the field.
    expect(tokens(controlBorder(false))).toEqual([
      'border-line',
      'hover:border-line-strong',
      'focus:border-focus',
      'focus-visible:ring-focus',
    ]);
    expect(tokens(segmentedBorder(false))).toEqual([
      'border-line',
      FRAME_HOVER,
      'focus-within:border-focus',
    ]);
  });

  it('lets a frame focused through its child keep the focus border under the pointer', () => {
    // focus-within and has- are emitted before hover, so an unconditional
    // hover would repaint a focused frame gray.
    expect(FRAME_HOVER).toBe('hover:not-focus-within:border-line-strong');
  });

  it('keeps the error and the suggestion borders still under the pointer', () => {
    for (const classes of [
      controlBorder(true),
      controlBorder(false, true),
      segmentedBorder(true),
      segmentedBorder(false, true),
    ])
      expect(classes).not.toContain('hover:');
  });
});
