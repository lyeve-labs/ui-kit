/**
 * The one rule the kit applies to an href it did not write itself.
 *
 * A component takes a URL from its caller, and a caller takes it from data, so
 * `javascript:` and `data:` arrive as markup and leave as a script the page
 * never wrote. Button carried this rule inline and Pagination now builds hrefs
 * from a caller supplied function, and a rule kept in two places is a rule that
 * gets fixed in one of them.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/**
 * The characters a browser drops before it reads the scheme.
 *
 * The URL parser trims leading and trailing ASCII whitespace and strips tab,
 * line feed and carriage return from anywhere in the value, so a tab written
 * inside the word `javascript` still navigates while an anchored scheme test on
 * the raw string sees an unknown scheme and allows it through.
 */
const IGNORED = /[\u0000-\u0020]/g;

const DENIED = /^(?:javascript|data|vbscript):/i;

/** The href as given, or nothing when its scheme is one no component will emit. */
export function safeHref(href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  return DENIED.test(href.replace(IGNORED, '')) ? undefined : href;
}
