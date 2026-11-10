/**
 * The single source of truth for how a checkbox or a radio looks and announces
 * itself.
 *
 * Checkbox, Radio and RadioGroup paint one control three ways, and composing
 * from here keeps them one control. The focus ring stays outside the selected
 * state: when it sat inside, selecting an option deleted the only indicator a
 * keyboard user had, and in a list of a hundred options that loses your place.
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

import { FIELD_HINT, FIELD_LABEL } from './field.js';
import type { IconPx } from './icon.js';
import { HIT_AREA } from './touch.js';

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

/**
 * The inline wrapper carries the hit box, not the box inside it. A click
 * anywhere on the label reaches the input, so growing the label's hit area
 * under a finger is what makes a 16px checkbox a 44px target without drawing
 * it any larger. A card is its own surface and already clears the size.
 */
const WRAP_INLINE = `${HIT_AREA} inline-flex select-none items-start gap-2.5`;

const WRAP_CARD = 'flex select-none items-start gap-2.5 rounded-lg border p-3 transition-colors';

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
    // A card rests on the soft line a Card draws and firms under the pointer.
    // A selected card is tinted with no brand edge: the filled box or dot
    // inside it is the mark, and a full brand border round the card drew the
    // brightest line on the page. The tint stays at 8%, because the faint
    // description on a 12% tint falls under 4.5:1 on the light page. It is a
    // tint rather than a fill because the label sits on it, and solid brand
    // behind body text drops the contrast below AA. The input covers the
    // card, so the pointer is over the input and the hover is a peer's.
    const paint = checked ? 'border-line bg-brand/8' : 'border-line bg-surface-2';
    const hover = disabled ? '' : ' peer-hover:border-line-strong';
    return `${WRAP_CARD} ${paint}${hover} ${cursor}`;
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

const BOX_BASE = 'pointer-events-none flex shrink-0 items-center justify-center transition-colors';

/**
 * The painted box or circle. Square for a checkbox, round for a radio, sized by
 * ChoiceSize.
 *
 * The resting border is `border-line-strong` at 60%, about 2:1 on every
 * ground in both themes, and it firms to full `line-strong` under the
 * pointer. Full line-strong drew a gray frame round every box. `border-line`
 * reads 1.15:1 on the box's own fill, and the border is the only thing that
 * shows an empty checkbox is there, so at that contrast the box disappears
 * until it is used. A radio keeps a 2px ring because its selected state is a
 * dot inside the ring rather than a fill, and a 1px ring reads as a smudge
 * beside the dot at 14px. In a card the input covers the card, not the box,
 * so the card's own border firms and the box keeps its resting edge.
 *
 * `mixed` paints exactly what `checked` paints. A part-selected parent is on,
 * not a third state with a color of its own. Only the mark it holds differs.
 */
export function choiceBox(
  kind: 'checkbox' | 'radio',
  size: ChoiceSize,
  checked: boolean,
  mixed: boolean,
  suggested = false,
): string {
  const on = checked || mixed;
  const shape = kind === 'radio' ? 'rounded-full border-2' : 'rounded-xs border';
  // A suggested choice paints violet where a chosen one paints brand, so the
  // box the assistant ticked reads as the assistant's until it is reviewed.
  const paint = on
    ? kind === 'radio'
      ? suggested
        ? 'border-violet bg-surface-2'
        : 'border-brand bg-surface-2'
      : suggested
        ? 'border-violet bg-violet text-ink'
        : 'border-brand bg-brand text-ink'
    : CHOICE_EDGE;
  return `${BOX_BASE} ${CHOICE_SQUARE[size]} ${shape} ${paint} ${CHOICE_FOCUS}`;
}

/** The edge of an empty box or ring, which firms under the pointer unless the input is disabled. */
export const CHOICE_EDGE =
  'border-line-strong/60 bg-surface-2 peer-enabled:peer-hover:border-line-strong';

/**
 * The focus ring, stated ONCE and outside every checked branch.
 *
 * The ring lived inside the checked ternary in three components, so choosing an
 * option removed the only indicator a keyboard user had. It is a ring and not a
 * border color because a selected box already carries a brand border, which
 * leaves a border-only focus state with nothing to say.
 */
export const CHOICE_FOCUS =
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-focus-visible:outline-offset-2';

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
 * list, and given no color of its own so it inherits the label and dims with
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
 * These are the same 14, 16 and 20 the slot reserves. An icon rendered at any
 * other size overflows the slot or floats inside it. Each is a rung of the
 * icon ladder, which the type holds.
 */
export const CHOICE_ICON_PX: Record<ChoiceSize, IconPx> = {
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
 * The group's heading. A rendered legend is not a flex item: the browser lays
 * it out as the fieldset's legend, outside the flex formatting context, so
 * the group's gap applies between the list and the hint and never between
 * the legend and the list. The legend carries the distance itself, the same
 * 6px a Field puts between its label and its control. A hidden legend is
 * absolutely positioned and the margin does nothing there.
 */
export const CHOICE_LEGEND = `${FIELD_LABEL} mb-1.5`;

/**
 * The row or column the options sit in.
 *
 * A horizontal group gets a wider inline gap than block gap: options read as
 * separate choices across a row and as one list down a column, and an equal gap
 * in both axes makes a wrapped row look like a grid.
 *
 * Under a finger the rows of an inline group move apart until their 44px hit
 * boxes meet. At the 8px a mouse keeps, each box covered a third of the row
 * below it, and the later row takes an overlap, so a tap on the bottom of one
 * option picked the next one. A card is taller than the box and keeps its gap.
 */
export function choiceGroupList(
  orientation: ChoiceOrientation,
  size: ChoiceSize,
  variant: ChoiceVariant,
): string {
  const list =
    orientation === 'horizontal'
      ? 'flex flex-row flex-wrap gap-x-5 gap-y-2'
      : 'flex flex-col gap-2';
  return variant === 'inline' ? `${list} ${COARSE_ROW_GAP[size]}` : list;
}

/**
 * 44px less the label line an inline row is as tall as: 16, 20 or 24px.
 * Spelled out per size because Tailwind generates only the class names it
 * finds written whole.
 */
const COARSE_ROW_GAP: Record<ChoiceSize, string> = {
  sm: 'coarse:gap-y-7',
  md: 'coarse:gap-y-6',
  lg: 'coarse:gap-y-5',
};

/**
 * The check and the mixed marks, as SVG path data on the box's own grid.
 *
 * Drawn as paths because the consistency suite rejects a Unicode check outright,
 * and because a font glyph lands at a different optical weight from every other
 * icon in the library. Both sit in a 10 by 8 viewBox centered in the box, at
 * stroke width 1.5 with round caps, so the two marks swap without the box
 * shifting. The mixed bar stops short of the edges so its round caps do not
 * touch the border.
 */
export const CHOICE_MARK: { check: string; mixed: string } = {
  check: 'M1 4l3 3 5-6',
  mixed: 'M1.5 4h7',
};
