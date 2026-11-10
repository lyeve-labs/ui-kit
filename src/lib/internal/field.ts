/**
 * The single source of truth for how a form control looks and announces itself.
 *
 * Every text-entry control in the library composes its classes from here rather
 * than spelling them out inline, so an Input and a NumberInput placed side by
 * side line up, and changing a control's appearance means changing one of
 * these constants.
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

/** Vertical rhythm inside a labeled field: label, control, hint/error. */
export const FIELD_WRAP = 'flex flex-col gap-1.5';

/**
 * The marker every labeled field carries on its outermost element, and the
 * only way a surface can ask how much form it is holding.
 *
 * A class would not do: FIELD_WRAP is three utilities a caller may legitimately
 * write by hand, so counting it would count any column with a 6px gap. The
 * attribute says what the element is rather than how it looks, and a radio or
 * checkbox group carries it on the fieldset, so a group of eight options is
 * one field and not eight.
 */
export const FIELD_MARKER = '[data-field]';

/**
 * How many fields a subtree renders, counting a group as one.
 *
 * Only the outermost markers count. A group marks its fieldset and each option
 * inside it marks its own wrapper, so a plain `querySelectorAll` length would
 * read a five-option radio group as six fields and size a panel for a form
 * that is not there.
 */
export function countFields(root: ParentNode): number {
  const all = [...root.querySelectorAll(FIELD_MARKER)];
  return all.filter((el) => !all.some((other) => other !== el && other.contains(el))).length;
}

/** The label above a control. */
export const FIELD_LABEL = 'text-sm font-medium text-fg';

/** Hint text below a control. Shown only when there is no error. */
export const FIELD_HINT = 'text-xs text-faint';

/** Error text below a control. Replaces the hint rather than stacking with it. */
export const FIELD_ERROR = 'text-xs text-danger';

/**
 * The depth every field shares: an inner shadow along the top edge that sinks
 * it into the surface. It is a shadow, so the field keeps its height and its
 * border. Focus draws no glow around the field.
 */
const CONTROL_DEPTH = 'inset-shadow-well';

/**
 * The second pixel of a focused field's edge. The border turns the focus
 * color and this inset ring repeats it just inside, so focus reads as one
 * 2px edge in one color. A 2px ring at half strength inside the border read
 * as two lines, one inside the other. The ring's color comes from
 * controlBorder with the border's, so a field in error or holding a
 * suggestion keeps its own color while it has focus. It appears with the
 * border rather than easing in, because a focus indicator that fades is late
 * for the key press that moved it.
 */
export const CONTROL_FOCUS_RING = 'focus-visible:ring-1 focus-visible:ring-inset';

/**
 * Everything a single-line control needs except its border color.
 *
 * `h-control` is a theme token (2.375rem / 38px), not a literal, so the height
 * is stated once. Controls that grow with their content (Textarea, the
 * MultiSelect chip well) use `CONTROL_MULTILINE` instead and keep the token as
 * a minimum.
 *
 * `outline-none` is paired with CONTROL_FOCUS_RING, because a utility beats the
 * global `:focus-visible` outline in theme.css and would otherwise leave focus
 * as a 1px border-color change.
 */
export const CONTROL_BASE =
  'w-full h-control rounded-lg bg-surface-2 border px-3 text-sm text-fg ' +
  'placeholder:text-faint transition-colors outline-none ' +
  `${CONTROL_DEPTH} ${CONTROL_FOCUS_RING} ` +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/** As CONTROL_BASE, for controls whose height is driven by their content. */
export const CONTROL_MULTILINE =
  'w-full min-h-control rounded-lg bg-surface-2 border px-3 py-2 text-sm text-fg ' +
  'placeholder:text-faint transition-colors outline-none ' +
  `${CONTROL_DEPTH} ${CONTROL_FOCUS_RING} ` +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * The border a control carries at rest, under the pointer and on focus.
 *
 * It rests on line, the soft edge a card and a button draw, and firms to
 * line-strong under the pointer. The field's label, its fill and its
 * placeholder or value mark it, and line-strong drew a gray frame round every
 * field on the navy grounds. Focus moves the border to the focus color, at
 * full strength, because a focus border at reduced alpha reads as a weaker
 * focus for no reason a user could infer. Each branch also colors the
 * CONTROL_FOCUS_RING inside it, so the focused edge is 2px of one color in
 * every state, red in error and violet while a suggestion stands.
 *
 * hover comes before focus in the order Tailwind emits variants, so a
 * focused field under the pointer keeps its focus border.
 */
export function controlBorder(error: boolean, suggested = false): string {
  if (error) return 'border-danger focus:border-danger focus-visible:ring-danger';
  return suggested ? ASSIST_BORDER : CONTROL_EDGE;
}

/** The resting, hovered and focused border of a field that takes focus itself. */
const CONTROL_EDGE =
  'border-line hover:border-line-strong focus:border-focus focus-visible:ring-focus';

/**
 * The hover border of a frame that holds the focusable part, such as a
 * MultiSelect's chip well or a CopyField. Its focus border comes from a
 * focus-within or has- variant, which Tailwind emits before hover, so the
 * hover yields while anything inside holds focus.
 */
export const FRAME_HOVER = 'hover:not-focus-within:border-line-strong';

/**
 * A control holding a value the assistant suggested. Violet replaces both the
 * resting border and the focus border, so the mark stays while the
 * person works in the field and leaves only when they decide it.
 */
const ASSIST_BORDER = 'border-violet focus:border-violet focus-visible:ring-violet';

/**
 * The field wrapper while it holds a suggestion: a dashed violet rule down
 * its start edge, the mark the approved screens give a value nobody has
 * reviewed yet.
 */
export const ASSIST_WRAP =
  ' relative ps-3 before:absolute before:inset-y-0.5 before:start-0 before:border-s-2 before:border-dashed before:border-violet';

/** The Suggested tag after a field's label. */
export const ASSIST_TAG = 'ms-2 text-xs font-medium text-violet';

/**
 * Wires a control to whichever of its hint or error is on screen.
 *
 * Returns undefined when neither is present, so the attribute is omitted rather
 * than pointing at an element that was never rendered. Only Input carried
 * `aria-invalid` before this. Nothing carried `aria-describedby`, so a screen
 * reader announced the control and never the reason it was rejected.
 */
export function describedBy(
  id: string | undefined,
  error?: string,
  hint?: string,
): string | undefined {
  if (!id) return undefined;
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

/**
 * A control built from several inputs rather than from one.
 *
 * CONTROL_BASE is `w-full` and assumes a single input fills the control, so a
 * time field composed from it stretched three two-character segments across a
 * whole column and left the separators floating in the gaps. This shrink-wraps
 * its content instead and keeps `h-control`, so a segmented control and an
 * Input placed in the same row still line up.
 *
 * The focus border is driven by `focus-within`. The wrapper is a div, it never
 * receives focus itself, and `focus:border-focus` on it can therefore never
 * match: the control would sit at its resting border while one of its segments
 * held the caret.
 */
export const CONTROL_SEGMENTED =
  'inline-flex h-control items-center gap-0.5 rounded-lg bg-surface-2 border px-3 ' +
  'text-sm text-fg transition-colors inset-shadow-well';

/** As controlBorder, for a wrapper that is only ever focused through a child. */
export function segmentedBorder(error: boolean, suggested = false): string {
  if (error) return 'border-danger focus-within:border-danger';
  return suggested
    ? 'border-violet focus-within:border-violet'
    : `border-line ${FRAME_HOVER} focus-within:border-focus`;
}

/**
 * One segment inside CONTROL_SEGMENTED.
 *
 * It carries no width. A two-digit segment needs a fixed one so the control
 * does not resize as the user types, and an AM/PM select needs to size to its
 * own text. Stating a width here would mean one of the two overriding it, and
 * two width utilities on one element resolve by the order Tailwind emits them
 * rather than the order they were written.
 *
 * The focus ring is inset. The segment sits flush inside the wrapper's border,
 * so the global 2px outset outline would be drawn over that border and clipped
 * by the wrapper's own rounding. It draws the full focus ring rather than the
 * field's softer one, because nothing else marks which segment has focus.
 */
export const CONTROL_SEGMENT =
  'shrink-0 rounded-sm border-0 bg-transparent p-0 text-center text-sm text-fg tabular-nums ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ' +
  'disabled:cursor-not-allowed';

/**
 * Joins a control's own message id with the ids its caller names.
 *
 * A control inside a Field, or explained by text elsewhere on the page, has to
 * point at that text as well as at its own hint or error. Returns undefined
 * when there is nothing to point at, for the reason describedBy does.
 */
export function joinIds(...ids: (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}
