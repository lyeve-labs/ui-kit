/**
 * One filter contract for every list-bearing control.
 *
 * MultiSelect and Autocomplete each spelled the same expression by hand, at
 * MultiSelect.svelte:51-53 and Autocomplete.svelte:60-64:
 *
 *     options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
 *
 * It reads the label and nothing else, so an option a user knows by its value,
 * its airport code or a synonym could not be found. It compares raw code
 * points, so a query of "cafe" missed an option labelled with an acute accent.
 * It trims and lowercases the query once per option instead of once per
 * keystroke. And it is not a prop, so a consumer whose list arrives already
 * narrowed by a server query had no way to switch local filtering off or to say
 * what a match means for their data. Both controls now call applyFilter, which
 * takes a matcher the call site can replace or disable.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/** What a matcher is told about the query, computed once per keystroke rather than per option. */
export interface FilterContext {
  /** Exactly what the user typed, untouched. */
  readonly query: string;
  /**
   * query trimmed, lowercased and NFD diacritic-folded. Precomputed: folding
   * per option is O(n) work for a value that cannot change within a pass.
   */
  readonly needle: string;
  /** Position in the unfiltered array, so a rank-aware matcher can weight earlier entries. */
  readonly index: number;
}

/** A matcher. Returning false drops the option. */
export type FilterFn<T> = (option: T, ctx: FilterContext) => boolean;

/**
 * A filter prop: the default matcher, a replacement, or false to disable
 * filtering entirely (the list is already filtered upstream, for instance by a
 * server query).
 */
export type FilterInput<T> = FilterFn<T> | false | undefined;

/**
 * Trim, lowercase, and fold diacritics through NFD so that a query of "e"
 * matches an option spelled with an acute accent.
 *
 * NFD splits an accented letter into its base letter and a combining mark, so
 * dropping the Mark category afterwards leaves the base letters and nothing
 * else. That also folds marks in scripts where a mark distinguishes two words,
 * which shows the user one option too many rather than hiding the one they were
 * typing toward. A string that is only marks folds to nothing, which is the
 * same answer as an empty query and is what the callers treat it as.
 */
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
}

/**
 * The default matcher: case- and accent-insensitive substring over the label,
 * plus any keywords the option carries. Label-only matching is what ships
 * today; keywords are additive and absent on every existing option, so adopting
 * this changes no current list.
 *
 * An empty needle keeps every option. applyFilter answers an empty query before
 * it reaches a matcher, so this case is here for a call site that composes the
 * default into a matcher of its own.
 */
export function defaultFilter<T extends { label: string; keywords?: readonly string[] }>(
  option: T,
  ctx: FilterContext,
): boolean {
  if (ctx.needle === '') return true;
  if (normalize(option.label).includes(ctx.needle)) return true;
  const keywords = option.keywords;
  return keywords !== undefined && keywords.some((word) => normalize(word).includes(ctx.needle));
}

/**
 * Applies a FilterInput across a list, building the context once.
 *
 * An empty or whitespace-only query returns the input array unchanged, by
 * identity, so a caller can compare references to skip work. A query that folds
 * away to nothing counts as empty for the same reason: there is no needle left
 * to look for, and matching every label against "" would drop nothing anyway.
 *
 * false is answered before the query is read, so a keystroke that is still in
 * the box cannot reintroduce local filtering on a list the server already cut.
 */
export function applyFilter<T extends { label: string; keywords?: readonly string[] }>(
  options: readonly T[],
  query: string,
  filter?: FilterInput<T>,
): readonly T[] {
  if (filter === false) return options;

  const needle = normalize(query);
  if (needle === '') return options;

  const match: FilterFn<T> = filter ?? defaultFilter;
  const kept: T[] = [];
  for (let index = 0; index < options.length; index++) {
    // index counts the input, not kept: a matcher that weights the top of the
    // list has to see the same number for an option however many entries above
    // it the query has already removed.
    const option = options[index];
    if (match(option, { query, needle, index })) kept.push(option);
  }
  return kept;
}
