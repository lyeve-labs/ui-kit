import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHOICE_DESCRIPTION,
  CHOICE_FOCUS,
  CHOICE_GROUP,
  CHOICE_ICON_PX,
  CHOICE_INPUT,
  CHOICE_LABEL_STACK,
  CHOICE_MARK,
  choiceBox,
  choiceGroupList,
  choiceIcon,
  choiceLabel,
  choiceWrap,
  type ChoiceOrientation,
  type ChoiceSize,
  type ChoiceVariant,
} from './choice.js';

const KINDS = ['checkbox', 'radio'] as const;
const SIZES: ChoiceSize[] = ['sm', 'md', 'lg'];
const VARIANTS: ChoiceVariant[] = ['inline', 'card'];
const ORIENTATIONS: ChoiceOrientation[] = ['vertical', 'horizontal'];
const FLAGS = [false, true];

type BoxCase = {
  kind: (typeof KINDS)[number];
  size: ChoiceSize;
  checked: boolean;
  mixed: boolean;
};

const BOX_CASES: BoxCase[] = KINDS.flatMap((kind) =>
  SIZES.flatMap((size) =>
    FLAGS.flatMap((checked) => FLAGS.map((mixed) => ({ kind, size, checked, mixed }))),
  ),
);

function classes(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

describe('choiceBox', () => {
  it.each(BOX_CASES)(
    'keeps the focus ring on a $kind that is $size, checked=$checked, mixed=$mixed',
    ({ kind, size, checked, mixed }) => {
      // RadioGroup put the ring inside the selected ternary, so selecting an
      // option deleted the only indicator a keyboard user had. The ring belongs
      // to every combination, which is why every combination is listed.
      const box = choiceBox(kind, size, checked, mixed);
      for (const focus of classes(CHOICE_FOCUS)) {
        expect(box).toContain(focus);
      }
    },
  );

  it.each(BOX_CASES)(
    'never spells the resting border as border-line on a $kind that is $size, checked=$checked, mixed=$mixed',
    ({ kind, size, checked, mixed }) => {
      // border-line reads 1.25:1 against the page. It is the divider colour,
      // and an empty box has nothing else identifying it as a control.
      expect(classes(choiceBox(kind, size, checked, mixed))).not.toContain('border-line');
    },
  );

  it.each(KINDS.flatMap((kind) => SIZES.map((size) => ({ kind, size }))))(
    'rests a $size $kind on border-line-strong',
    ({ kind, size }) => {
      expect(classes(choiceBox(kind, size, false, false))).toContain('border-line-strong');
    },
  );

  it.each(SIZES)('paints a mixed %s checkbox exactly as a checked one', (size) => {
    // Mixed is a parent that is partly on, not a third colour. Only the mark
    // inside the box changes.
    expect(choiceBox('checkbox', size, false, true)).toBe(choiceBox('checkbox', size, true, false));
    expect(classes(choiceBox('checkbox', size, false, true))).toContain('bg-brand');
  });

  it.each(SIZES)('sizes a %s box on the shared square', (size) => {
    const expected: Record<ChoiceSize, string> = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };
    for (const unit of classes(expected[size])) {
      expect(classes(choiceBox('checkbox', size, false, false))).toContain(unit);
    }
  });

  it.each(SIZES)('rounds a %s radio and squares a checkbox', (size) => {
    expect(classes(choiceBox('radio', size, false, false))).toContain('rounded-full');
    expect(classes(choiceBox('checkbox', size, false, false))).not.toContain('rounded-full');
  });
});

describe('choiceWrap', () => {
  it.each(VARIANTS.flatMap((variant) => FLAGS.map((checked) => ({ variant, checked }))))(
    'marks a disabled $variant option, checked=$checked',
    ({ variant, checked }) => {
      const wrap = classes(choiceWrap(variant, checked, true));
      expect(wrap).toContain('cursor-not-allowed');
      expect(wrap).toContain('opacity-50');
    },
  );

  it.each(VARIANTS.flatMap((variant) => FLAGS.map((checked) => ({ variant, checked }))))(
    'leaves one cursor on an enabled $variant option, checked=$checked',
    ({ variant, checked }) => {
      // Two cursor utilities in one list resolve by stylesheet order, not by
      // the order written, so a disabled option kept offering a pointer.
      const wrap = classes(choiceWrap(variant, checked, false));
      expect(wrap).toContain('cursor-pointer');
      expect(wrap).not.toContain('cursor-not-allowed');
      expect(wrap).not.toContain('opacity-50');
    },
  );

  it.each(FLAGS)('gives a disabled card exactly one cursor, checked=%s', (checked) => {
    const wrap = classes(choiceWrap('card', checked, true));
    expect(wrap.filter((c) => c.startsWith('cursor-'))).toEqual(['cursor-not-allowed']);
  });

  it('tints a selected card and borders an unselected one at full strength', () => {
    expect(classes(choiceWrap('card', true, false))).toContain('border-brand');
    expect(classes(choiceWrap('card', false, false))).toContain('border-line-strong');
    expect(classes(choiceWrap('card', false, false))).not.toContain('border-line');
  });

  it('leaves the inline wrapper unpainted, so it takes the surface behind it', () => {
    for (const checked of FLAGS) {
      const wrap = classes(choiceWrap('inline', checked, false));
      expect(wrap.filter((c) => c.startsWith('bg-') || c.startsWith('border-'))).toEqual([]);
    }
  });
});

describe('choiceGroupList', () => {
  it.each(ORIENTATIONS)('lays %s options out', (orientation) => {
    const list = classes(choiceGroupList(orientation));
    expect(list).toContain('flex');
    expect(list).toContain(orientation === 'horizontal' ? 'flex-row' : 'flex-col');
    expect(list).not.toContain(orientation === 'horizontal' ? 'flex-col' : 'flex-row');
  });

  it('wraps a horizontal group, so a narrow column does not clip the last option', () => {
    expect(classes(choiceGroupList('horizontal'))).toContain('flex-wrap');
  });

  it('lets a fieldset shrink', () => {
    // A fieldset defaults to min-width: min-content, so one long label widened
    // the group past its column instead of wrapping.
    expect(classes(CHOICE_GROUP)).toContain('min-w-0');
  });
});

describe('label and icon', () => {
  it.each(SIZES)('scales the %s label with the control', (size) => {
    const label = classes(choiceLabel(size));
    expect(label).toContain('text-fg');
    expect(label.filter((c) => c.startsWith('text-') && c !== 'text-fg')).toHaveLength(1);
  });

  it('gives every size a distinct label scale', () => {
    const scales = SIZES.map((size) => choiceLabel(size));
    expect(new Set(scales).size).toBe(SIZES.length);
  });

  it('keeps the option label lighter than the group label', () => {
    // The group label is the field label and carries the medium weight. An
    // option names one choice and would compete with it.
    for (const size of SIZES) {
      expect(classes(choiceLabel(size))).not.toContain('font-medium');
    }
  });

  it.each(SIZES)('reserves the same square for a %s icon as for the box', (size) => {
    const icon = classes(choiceIcon(size));
    for (const unit of classes(choiceBox('checkbox', size, false, false)).filter(
      (c) => c.startsWith('h-') || c.startsWith('w-'),
    )) {
      expect(icon).toContain(unit);
    }
  });

  it.each(SIZES)('gives a %s icon no colour of its own', (size) => {
    // The icon inherits the label, so a disabled option dims it through the
    // wrapper opacity rather than through a second rule.
    expect(classes(choiceIcon(size)).filter((c) => c.startsWith('text-'))).toEqual([]);
  });

  it.each(SIZES)('states the %s lucide size in pixels', (size) => {
    expect(CHOICE_ICON_PX[size]).toBe({ sm: 14, md: 16, lg: 20 }[size]);
  });

  it('reuses the shared hint class for the description', () => {
    expect(CHOICE_DESCRIPTION).toBe('text-xs text-faint');
  });

  it('stacks the label over its description', () => {
    expect(classes(CHOICE_LABEL_STACK)).toContain('flex-col');
  });
});

describe('the input covers the box', () => {
  it('is transparent, positioned over the box and readable as a peer', () => {
    // sr-only leaves the input 1x1 and buried under the box that replaces it,
    // so nothing can click it, and the box below reads its focus through peer.
    const input = classes(CHOICE_INPUT);
    expect(input).not.toContain('sr-only');
    expect(input).toEqual(
      expect.arrayContaining(['peer', 'absolute', 'inset-0', 'h-full', 'w-full', 'opacity-0']),
    );
  });
});

describe('marks', () => {
  // Written as escapes so this file does not itself carry the characters the
  // consistency suite rejects.
  const GLYPHS = /[\u00d7\u2212\u2713\u2139]/;

  it.each(Object.entries(CHOICE_MARK))('draws the %s mark as path data', (_name, path) => {
    expect(path).toMatch(/^M[\d\s.,hvlHVLzZ-]+$/);
    expect(path).not.toMatch(GLYPHS);
  });

  it('draws two different marks', () => {
    expect(CHOICE_MARK.check).not.toBe(CHOICE_MARK.mixed);
  });
});

describe('every class this module hands out', () => {
  const emitted: string[] = [
    CHOICE_INPUT,
    CHOICE_FOCUS,
    CHOICE_LABEL_STACK,
    CHOICE_DESCRIPTION,
    CHOICE_GROUP,
    ...SIZES.map(choiceLabel),
    ...SIZES.map(choiceIcon),
    ...ORIENTATIONS.map(choiceGroupList),
    ...VARIANTS.flatMap((variant) =>
      FLAGS.flatMap((checked) => FLAGS.map((disabled) => choiceWrap(variant, checked, disabled))),
    ),
    ...BOX_CASES.map((c) => choiceBox(c.kind, c.size, c.checked, c.mixed)),
  ];

  const PALETTE =
    /\b(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b/;

  it.each(emitted)('%s uses no arbitrary value', (value) => {
    // Tailwind matches whole class names in source text, and an arbitrary
    // value written here is a length nobody can retheme.
    expect(value).not.toMatch(/[[\]]/);
  });

  it.each(emitted)('%s uses no raw palette colour', (value) => {
    expect(value).not.toMatch(PALETTE);
    expect(value).not.toMatch(/#[0-9a-fA-F]{3}/);
  });

  it('builds no class name out of a runtime value', () => {
    // A class assembled from a variable matches no candidate, so Tailwind
    // generates no rule and the class silently does nothing.
    const src = readFileSync(join(__dirname, 'choice.ts'), 'utf8');
    expect(src).not.toMatch(/[a-z]-\[/);
    expect(src).not.toMatch(/\$\{[^}]*\}[a-z-]*-/);
  });
});
