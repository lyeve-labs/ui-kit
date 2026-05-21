/**
 * Join an arbitrary list of class-name expressions into a single string.
 *
 * Falsy entries (`undefined`, `null`, `false`, `0`, `''`) are dropped so you
 * can write conditionals inline without sprinkling `&&` and ternaries:
 *
 *     cn('btn', isPrimary && 'btn-primary', { 'is-disabled': disabled })
 *
 * Object entries are treated as `{ className: boolean }` maps, matching the
 * behaviour of `clsx` so existing muscle memory carries over.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const value of inputs) {
    if (!value) continue;

    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      continue;
    }

    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
      continue;
    }

    if (typeof value === 'object') {
      for (const key in value) {
        if (value[key]) out.push(key);
      }
    }
  }

  return out.join(' ');
}
