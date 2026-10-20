/**
 * A file input's `accept` list, read out as the names a person scans for.
 *
 * The attribute is written for the browser: extensions and MIME types side by
 * side, often naming one format twice (`.json,application/json`) and sometimes
 * as a vendor type longer than the drop zone is wide. Printed as it stands it
 * runs as one unbroken line. Each entry folds to the short name a reader knows
 * the format by, duplicates collapse, and the list joins as an English "or".
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

/**
 * Names a reader knows a format by, keyed by an extension or a MIME subtype.
 * Both spellings go through one table, so `.yml` and `application/yaml` fold
 * into one entry.
 */
const ALIASES: Record<string, string> = {
  plain: 'txt',
  jpeg: 'jpg',
  yml: 'yaml',
  htm: 'html',
  tif: 'tiff',
  'ld+json': 'JSON-LD',
  msword: 'DOC',
  'vnd.ms-excel': 'XLS',
  'vnd.ms-powerpoint': 'PPT',
  'vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'vnd.oasis.opendocument.text': 'ODT',
  'vnd.oasis.opendocument.spreadsheet': 'ODS',
};

/** Whole types whose subtype alone names the wrong format. */
const TYPES: Record<string, string> = {
  'audio/mpeg': 'MP3',
};

/** What `type/*` accepts, said as a kind of file rather than a format. */
const WILDCARDS: Record<string, string> = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
  text: 'text files',
};

/** Fixed to en-US for the reason `number.ts` gives: server and browser must agree. */
const OR_LIST = new Intl.ListFormat('en-US', { type: 'disjunction' });

function alias(format: string): string {
  return (ALIASES[format] ?? format).toUpperCase();
}

function name(entry: string): string {
  const token = entry.toLowerCase();
  if (token.startsWith('.')) return alias(token.slice(1));
  const [type, sub] = token.split('/');
  if (!sub) return entry;
  if (sub === '*') return WILDCARDS[type] ?? entry;
  if (TYPES[token]) return TYPES[token];
  if (ALIASES[sub]) return alias(sub);
  // A vendor type has no short form to derive, so an unknown one stays as
  // written rather than turning into a guess.
  if (sub.startsWith('vnd.')) return entry;
  return alias(sub.replace(/^x-/, '').split('+')[0]);
}

/** The `accept` list as a short line, or an empty string when it names nothing. */
export function describeAccept(accept: string): string {
  const names = accept
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(name);
  return OR_LIST.format([...new Set(names)]);
}
