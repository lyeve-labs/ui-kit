/**
 * A field label placed after a verb in an accessible name, such as "Copy API
 * key" or "Decrease port". Labels are sentence case, so only the first letter
 * drops to lower case, and not when the first word carries a capital after its
 * first letter (an acronym, "GitHub") or is "I": lowering the whole label read
 * "API key" out as "api key".
 */
export function inSentence(label: string): string {
  const first = label.split(/\s/, 1)[0] ?? '';
  if (/\p{Lu}/u.test(first.slice(1)) || first === 'I') return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}
