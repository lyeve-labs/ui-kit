/**
 * The single source of truth for how a floating panel looks.
 *
 * field.ts states the resting control and nothing stated the surface that
 * opens above it, so each of the four popovers grew its own:
 *
 *     MultiSelect  absolute z-50 mt-1 w-full rounded-xl border border-line
 *                  bg-surface shadow-2xl overflow-hidden
 *                  and, on an inner region, max-h-60 overflow-y-auto py-1
 *     Autocomplete absolute z-50 mt-1 w-full max-h-60 overflow-y-auto
 *                  rounded-xl border border-line bg-surface shadow-2xl py-1
 *     DatePicker   absolute z-50 mt-1 w-[17rem] rounded-xl border border-line
 *                  bg-surface shadow-2xl p-3
 *     Dropdown     absolute z-50 mt-1 py-1 min-w-36 rounded-xl border
 *                  border-line bg-surface shadow-2xl
 *
 * Three of those set a width the consumer cannot influence, and DatePicker
 * sets it as w-[17rem], a length no token governs. The scroll lives on an
 * inner region in one, on the surface itself in another and nowhere in the
 * other two, so a Dropdown of eighty items runs past the bottom of the window
 * and the last item cannot be reached. Two panels cap their height at max-h-60
 * and two never cap it. All four draw the boundary with border-line, which
 * reads 1.25:1 and is the only thing separating the panel from whatever it
 * happens to float over. The shadow is the one thing they agreed on.
 *
 * Width stays at the call site: a menu sized to its trigger and a calendar
 * sized to seven columns are different requirements. Everything else is here.
 *
 * One rule holds these together. No row carries two utilities for the same
 * property. Colour and background sit on the surface, and a row states only
 * the override its state earns, because two utilities for one property resolve
 * in the order Tailwind emits them and not in the order they were written.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/**
 * The floating surface every popover paints.
 *
 * border-line-strong, not border-line: a panel floating over arbitrary content
 * needs a boundary that clears 3:1, which line does not. It carries the
 * resting text colour so a row can override it with a single utility.
 */
export const PANEL_SURFACE =
  'absolute z-50 mt-1 rounded-xl border border-line-strong bg-surface text-fg shadow-2xl';

/**
 * The scrolling region inside it.
 *
 * The cap is a token, not max-h-60, so a fifth panel cannot pick a different
 * one. overscroll-contain stops a wheel that has reached the end of the list
 * from carrying on into the page behind the open panel.
 */
export const PANEL_LIST = 'max-h-panel-max overflow-y-auto overscroll-contain py-1';

/**
 * One row at rest.
 *
 * No background and no text colour of its own: it inherits both from the
 * surface, which leaves each state below a single utility to override.
 */
export const PANEL_OPTION =
  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ' +
  'transition-colors duration-150 outline-none hover:bg-surface-2 ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand';

/**
 * The active descendant.
 *
 * A tint alone reads 1.09:1 against the panel, which is not a visible state,
 * so the active row also carries an inset brand ring. Inset because the row
 * spans the full width of the panel and an outset ring is clipped by it.
 */
export const PANEL_OPTION_ACTIVE = 'bg-surface-2 ring-1 ring-inset ring-brand';

/**
 * A row whose value is selected, which is orthogonal to being active.
 *
 * The keyboard sits on one row while any number of rows are chosen, so this
 * changes the text and never the background the active row is using.
 */
export const PANEL_OPTION_SELECTED = 'font-medium text-brand';

/**
 * A row that cannot be chosen.
 *
 * pointer-events-none rather than a hover override: :hover still matches a
 * disabled button, and a second hover background on the same row would resolve
 * by emitted order, so the row could take the tint and read as choosable.
 */
export const PANEL_OPTION_DISABLED = 'pointer-events-none opacity-40';

/** The line shown when a filter matched nothing. */
export const PANEL_EMPTY = 'px-3 py-2 text-sm text-faint';

/** A group heading inside the list. Not focusable, so it takes no row classes. */
export const PANEL_GROUP_LABEL = 'px-3 pb-1 pt-3 text-xs font-medium uppercase text-faint';

/**
 * Composes the option classes for a row's state.
 *
 * Exists as a function because three booleans spelled inline at each call site
 * is how the four panels drifted. A disabled row takes the disabled treatment
 * and never the active one, even while the keyboard is resting on it: painting
 * it as the active descendant says Enter will choose it, and Enter will not.
 * Selection survives both, because a chosen row that has since been disabled
 * is still chosen.
 */
export function panelOption(state: {
  active: boolean;
  selected: boolean;
  disabled: boolean;
}): string {
  const parts = [PANEL_OPTION];
  if (state.selected) parts.push(PANEL_OPTION_SELECTED);
  if (state.disabled) {
    parts.push(PANEL_OPTION_DISABLED);
  } else if (state.active) {
    parts.push(PANEL_OPTION_ACTIVE);
  }
  return parts.join(' ');
}
