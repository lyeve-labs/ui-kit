/**
 * The single source of truth for how a form control looks and announces itself.
 *
 * Every text-entry control in the library composes its classes from here rather
 * than spelling them out inline. The nine controls had drifted into three focus
 * treatments, two wrapper gaps, two error-border opacities and two heights, so
 * an Input and a NumberInput placed side by side did not line up. Changing a
 * control's appearance now means changing one of these constants.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/** Vertical rhythm inside a labelled field: label, control, hint/error. */
export const FIELD_WRAP = 'flex flex-col gap-1.5';

/** The label above a control. */
export const FIELD_LABEL = 'text-sm font-medium text-fg';

/** Hint text below a control. Shown only when there is no error. */
export const FIELD_HINT = 'text-xs text-faint';

/** Error text below a control. Replaces the hint rather than stacking with it. */
export const FIELD_ERROR = 'text-xs text-danger';

/**
 * Everything a single-line control needs except its border colour.
 *
 * `h-control` is a theme token (2.375rem / 38px), not a literal, so the height
 * is stated once. Controls that grow with their content - Textarea, the
 * MultiSelect chip well - use `CONTROL_MULTILINE` instead and keep the token as
 * a minimum.
 */
export const CONTROL_BASE =
  'w-full h-control rounded-lg bg-surface-2 border px-3 text-sm text-fg ' +
  'placeholder:text-faint transition-colors duration-150 outline-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/** As CONTROL_BASE, for controls whose height is driven by their content. */
export const CONTROL_MULTILINE =
  'w-full min-h-control rounded-lg bg-surface-2 border px-3 py-2 text-sm text-fg ' +
  'placeholder:text-faint transition-colors duration-150 outline-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * The border a control carries at rest and on focus.
 *
 * Focus moves the border to full-strength brand. Two controls previously used
 * `border-brand/50`, which reads as a weaker focus for no reason a user could
 * infer, and the error focus was split between `border-danger` and
 * `border-danger/70`.
 */
export function controlBorder(error: boolean): string {
  return error ? 'border-danger focus:border-danger' : 'border-line focus:border-brand';
}

/**
 * Wires a control to whichever of its hint or error is on screen.
 *
 * Returns undefined when neither is present, so the attribute is omitted rather
 * than pointing at an element that was never rendered. Only Input carried
 * `aria-invalid` before this; nothing carried `aria-describedby`, so a screen
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
