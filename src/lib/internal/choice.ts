/**
 * The single source of truth for how a checkbox or a radio looks and announces
 * itself.
 *
 * Checkbox, Radio and RadioGroup paint one control three ways. The two label
 * wrappers hold the same utilities in two orders, Checkbox marks a required
 * option and Radio marks nothing, RadioGroup rests its box on `border-line`
 * where the other two use `border-line-strong`, and RadioGroup still keeps its
 * focus ring inside the selected ternary. That last one is the defect Checkbox
 * and Radio were already fixed for: selecting an option deleted the only
 * indicator a keyboard user had, and in a list of a hundred options that loses
 * your place entirely. Composing from here means a fourth choice control cannot
 * reintroduce any of it.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

import { FIELD_HINT } from './field.js';

/** The scale of the painted box: sm 14px, md 16px, lg 20px. */
export type ChoiceSize = 'sm' | 'md' | 'lg';

/** Inline is a box beside a label. Card is a bordered option surface. */
export type ChoiceVariant = 'inline' | 'card';

/** How a group lays its options out. */
export type ChoiceOrientation = 'vertical' | 'horizontal';

/**
 * The box and the icon slot share one size map, so the label text starts at the
 * same x whether or not an option carries an icon. 3.5 is 14px, 4 is 16px and 5
 * is 20px on the 4px grid.
 */
const CHOICE_SQUARE: Record<ChoiceSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const WRAP_INLINE = 'inline-flex select-none items-start gap-2.5';

const WRAP_CARD =
  'flex select-none items-start gap-2.5 rounded-lg border p-3 transition-colors duration-150';

/**
 * The clickable wrapper. Card is a bordered option the whole surface of which
 * is the target.
 *
 * The cursor is a ternary rather than a `cursor-pointer` that a disabled state
 * appends `cursor-not-allowed` to. Both set the same property, so a class list
 * carrying both resolves by stylesheet order and not by the order written here,
 * which is how a disabled option kept offering a pointer.
 */
export function choiceWrap(variant: ChoiceVariant, checked: boolean, disabled: boolean): string {
  const cursor = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';
  if (variant === 'card') {
    // A selected card is tinted rather than filled: the label sits on it, and
    // solid brand behind body text drops the contrast below AA.
    const paint = checked ? 'border-brand bg-brand/8' : 'border-line-strong bg-surface-2';
    return `${WRAP_CARD} ${paint} ${cursor}`;
  }
  return `${WRAP_INLINE} ${cursor}`;
}

/**
 * The transparent input that sits over the painted box and carries every native
 * semantic.
 *
 * `sr-only` leaves the input 1x1 and buried under the box that replaces it, so
 * a click aimed at what the user sees lands on nothing. It covers the box
 * instead, and `peer` is what lets the box below read its focus state.
 */
export const CHOICE_INPUT =
  'peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed';

const BOX_BASE =
  'pointer-events-none flex shrink-0 items-center justify-center transition-colors duration-150';

/**
 * The painted box or circle. Square for a checkbox, round for a radio, sized by
 * ChoiceSize.
 *
 * The resting border is `border-line-strong`. `border-line` reads 1.25:1
 * against the page, and the border is the only thing identifying an empty
 * checkbox as a control, so at that contrast the control is invisible until it
 * is used. A radio keeps a 2px ring because its selected state is a dot inside
 * the ring rather than a fill, and a 1px ring reads as a smudge beside the dot
 * at 14px.
 *
 * `mixed` paints exactly what `checked` paints. A part-selected parent is on,
 * not a third state with a colour of its own; only the mark it holds differs.
 */
export function choiceBox(
  kind: 'checkbox' | 'radio',
  size: ChoiceSize,
  checked: boolean,
  mixed: boolean,
): string {
  const on = checked || mixed;
  const shape = kind === 'radio' ? 'rounded-full border-2' : 'rounded-xs border';
  const paint = on
    ? kind === 'radio'
      ? 'border-brand bg-surface-2'
      : 'border-brand bg-brand text-ink'
    : 'border-line-strong bg-surface-2';
  return `${BOX_BASE} ${CHOICE_SQUARE[size]} ${shape} ${paint} ${CHOICE_FOCUS}`;
}

/**
 * The focus ring, stated ONCE and outside every checked branch.
 *
 * The ring lived inside the checked ternary in three components, so choosing an
 * option removed the only indicator a keyboard user had. It is a ring and not a
 * border colour because a selected box already carries a brand border, which
 * leaves a border-only focus state with nothing to say.
 */
export const CHOICE_FOCUS =
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand peer-focus-visible:outline-offset-2';

/**
 * The label stack beside or under the box.
 *
 * Checkbox and Radio both build this, in different word orders, which is how
 * two controls in one form ended up with different gaps between a label and its
 * description.
 */
export const CHOICE_LABEL_STACK = 'flex flex-col gap-0.5';

/**
 * The label text, sized with the control.
 *
 * An option label is not a field label: it names one choice rather than the
 * group, so it stays regular weight and FIELD_LABEL keeps the medium.
 */
export function choiceLabel(size: ChoiceSize): string {
  const scale: Record<ChoiceSize, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  return `${scale[size]} text-fg`;
}

/**
 * Secondary line under the label.
 *
 * The same class the hint under a text field uses, taken from field.ts rather
 * than respelled, because a checkbox hint and an input hint sitting in one form
 * have no reason to differ and had already drifted apart once.
 */
export const CHOICE_DESCRIPTION = FIELD_HINT;

/**
 * The icon slot ahead of the label.
 *
 * Fixed to the box size so the label starts at the same x in every row of a
 * list, and given no colour of its own so it inherits the label and dims with
 * the wrapper when the option is disabled.
 */
export function choiceIcon(size: ChoiceSize): string {
  return `flex shrink-0 items-center justify-center ${CHOICE_SQUARE[size]}`;
}

/**
 * Pixel size for a lucide icon at each ChoiceSize, so a consumer does not
 * guess.
 *
 * A lucide icon takes a number, not a class, so the slot above cannot size it.
 * These are the same 14, 16 and 20 the slot reserves; an icon rendered at any
 * other size overflows the slot or floats inside it.
 */
export const CHOICE_ICON_PX: Record<ChoiceSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

/**
 * The fieldset a group renders, so the set is announced as a group rather than
 * as loose controls.
 *
 * `min-w-0` is load bearing: a fieldset defaults to `min-width: min-content`,
 * so one long option label widened the whole group past its column instead of
 * wrapping.
 */
export const CHOICE_GROUP = 'flex min-w-0 flex-col gap-2';

/**
 * The row or column the options sit in.
 *
 * A horizontal group gets a wider inline gap than block gap: options read as
 * separate choices across a row and as one list down a column, and an equal gap
 * in both axes makes a wrapped row look like a grid.
 */
export function choiceGroupList(orientation: ChoiceOrientation): string {
  return orientation === 'horizontal'
    ? 'flex flex-row flex-wrap gap-x-5 gap-y-2'
    : 'flex flex-col gap-2';
}

/**
 * The check and the mixed marks, as SVG path data on the box's own grid.
 *
 * Drawn as paths because the consistency suite rejects a Unicode check outright,
 * and because a font glyph lands at a different optical weight from every other
 * icon in the library. Both sit in a 10 by 8 viewBox centred in the box, at
 * stroke width 1.5 with round caps, so the two marks swap without the box
 * shifting. The mixed bar stops short of the edges so its round caps do not
 * touch the border.
 */
export const CHOICE_MARK: { check: string; mixed: string } = {
  check: 'M1 4l3 3 5-6',
  mixed: 'M1.5 4h7',
};
