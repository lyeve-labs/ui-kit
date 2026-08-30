/**
 * The tone vocabulary, stated once.
 *
 * Alert, Banner and the toast store each named their neutral-informational tone
 * `info`, while Badge, Tag, Indicator and Progress named the same brand-cyan
 * tone `brand`. A consumer building a status row had to remember which
 * component wanted which word for the same colour. `brand` is canonical because
 * it names the token the tone actually resolves to; `info` still works and maps
 * onto it, so nothing that already ships has to change.
 */

/** Tones a status surface can carry. */
export type StatusTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger';

/** What a status surface accepts, including the retained `info` spelling. */
export type StatusToneInput = StatusTone | 'info';

/** Status tones plus the decorative accent, for labels rather than states. */
export type AccentTone = StatusTone | 'violet';

/** Resolves the accepted spelling to the canonical one. */
export function statusTone(tone: StatusToneInput): StatusTone {
  return tone === 'info' ? 'brand' : tone;
}

/**
 * The glyph each status tone draws, as SVG path data on a 24x24 grid.
 *
 * Alert and Toaster drew these as the literal characters ℹ ✓ ! ×, which pick up
 * whatever the user's font does with them - the check and the cross landed at
 * different optical weights from every other icon in the library, all of which
 * are stroked SVG.
 */
export const TONE_GLYPH: Record<StatusTone, string> = {
  neutral: 'M12 8h.01M11 12h1v4h1',
  brand: 'M12 8h.01M11 12h1v4h1',
  success: 'M20 6L9 17l-5-5',
  warn: 'M12 8v5M12 17h.01',
  danger: 'M18 6L6 18M6 6l12 12',
};
