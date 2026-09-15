/**
 * The two ways a control reaches 44px under a finger, named once so a
 * component picks one by name rather than respelling the classes.
 *
 * Both compile to nothing under a mouse. `pointer: coarse` is the query, and
 * the theme file is where it is declared: the `coarse:` variant, the 44px
 * value of `--spacing-control` and the `hit-area` utility all live beside the
 * palette so a consumer's build emits them.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/**
 * The control grows. For a control whose visual may take the finger's size:
 * a button, a tab, a sidebar row, a menu item. It reads the control token, so
 * the button and the input beside it grow together and stay level.
 */
export const TOUCH_GROW = 'coarse:min-h-control coarse:min-w-control';

/**
 * The control stays as drawn and its hit box grows. For a control that is
 * small on purpose: a switch, a checkbox, a breadcrumb, a pager step, a close
 * cross, an icon inside an input. The element must be positioned, so
 * `relative` comes with it. An element that is `absolute` already takes
 * HIT_AREA_POSITIONED instead: two position utilities on one element resolve
 * by stylesheet order, not by the order they are written.
 */
export const HIT_AREA = 'relative hit-area';

/** The same hit box on an element that positions itself already. */
export const HIT_AREA_POSITIONED = 'hit-area';
