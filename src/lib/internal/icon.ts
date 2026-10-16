/**
 * The five sizes an icon may take. Each console names the same ladder in its
 * own icon.ts, and the consistency suite holds every literal size in the kit
 * to this list.
 */
export const ICON_LADDER = [12, 14, 16, 20, 40] as const;

/**
 * A rung of the icon ladder. A size a component looks up in a table is typed
 * with it, so an entry off the ladder fails the type check where the suite
 * cannot read a number held in a variable.
 */
export type IconPx = (typeof ICON_LADDER)[number];
