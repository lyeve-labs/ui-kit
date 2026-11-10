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
// and a utility beats the base layer. outline-none therefore hands the focus
// indicator to whatever the control draws instead. A field draws its border
// in the focus color, and a segment, which has no border of its own, a ring.
describe('control bases keep a focus indicator', () => {
  it('CONTROL_SEGMENT pairs outline-none with a focus ring', () => {
    expect(CONTROL_SEGMENT).toContain('outline-none');
    expect(CONTROL_SEGMENT).toMatch(/focus-visible:ring-[12](\s|$)/);
  });

  it.each([
    { state: 'at rest', border: controlBorder(false) },
    { state: 'in error', border: controlBorder(true) },
    { state: 'holding a suggestion', border: controlBorder(false, true) },
  ])('marks focus on a field $state', ({ border }) => {
    // A border that keeps its color on focus marks nothing, so it needs a ring.
    const rest = border.split(/\s+/)[0].replace('border-', '');
    const focus = /(?:^|\s)focus:border-(\S+)/.exec(border)?.[1];
    expect(focus === rest ? /focus-visible:ring-1/.test(border) : focus === 'focus').toBe(true);
  });
});

// A focused field drew a 1px inset ring inside its focus border, and that 2px
// edge read heavier than the select beside it and the highlighted option in
// its list. The border alone turns the focus color, and nothing glows. A field
// in error or holding a suggestion keeps its color, so a 1px inset ring in that
// color marks its focus.
describe('a focused field', () => {
  const classes = (cls: string) => cls.split(/\s+/);

  for (const [name, cls] of Object.entries({ CONTROL_BASE, CONTROL_MULTILINE })) {
    it(`${name} draws no ring and no glow`, () => {
      expect(classes(cls).filter((c) => c.includes('ring'))).toEqual([]);
      expect(cls).not.toMatch(/shadow-glow/);
    });
  }

  it('turns the border of a field at rest the focus color, with no ring', () => {
    expect(classes(controlBorder(false))).toContain('focus:border-focus');
    expect(controlBorder(false)).not.toMatch(/ring/);
  });

  it.each([
    { state: 'in error', border: controlBorder(true), color: 'danger' },
    { state: 'holding a suggestion', border: controlBorder(false, true), color: 'violet' },
  ])('repeats the border of a field $state with a 1px inset ring', ({ border, color }) => {
    expect(classes(border)).toEqual(
      expect.arrayContaining([
        `focus:border-${color}`,
        'focus-visible:ring-1',
        'focus-visible:ring-inset',
        `focus-visible:ring-${color}`,
      ]),
    );
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
