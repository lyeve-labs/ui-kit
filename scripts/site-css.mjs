/**
 * The kit's stylesheet compiled for a page that has no Tailwind build of its
 * own, such as a static site. Run as a script, it writes dist/site.css.
 *
 * styles.css is Tailwind source: a consumer compiles it, and Tailwind emits a
 * rule for each class it finds. A page with no build gets nothing from it.
 * This compiles the same file with the same Tailwind over the components a
 * page block draws with and every kit module they import, so the result
 * styles those components, in all three schemes, and no others. Compiling
 * every component instead doubled the file.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { compile } from 'tailwindcss';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const theme = join(root, 'src/lib/styles/theme.css');

/** The components a page block draws with. A site component joins the list when it lands. */
const BLOCK_COMPONENTS = [
  'Accordion',
  'AccordionItem',
  'Badge',
  'Button',
  'Card',
  'Checkbox',
  'Field',
  'FormMessage',
  'Input',
  'Label',
  'SectionHeading',
  'Textarea',
  'Section',
  'Columns',
  'Prose',
  'Image',
  'Quote',
  'NavBar',
  'Footer',
  'Gallery',
];

/**
 * The file a relative import names. The kit writes `.js` for a TypeScript
 * module, a rune module and a component alike, so each is tried.
 *
 * @param {string} from
 * @param {string} specifier
 */
function resolveImport(from, specifier) {
  const path = resolve(dirname(from), specifier);
  const candidates = specifier.endsWith('.js')
    ? [path.replace(/\.js$/, '.ts'), path, path.replace(/\.js$/, '.svelte')]
    : [path];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`${from} imports ${specifier}, which does not exist`);
  return found;
}

/** The block components and every kit module they import, directly or not. */
function blockSources() {
  const files = BLOCK_COMPONENTS.map((name) => join(root, 'src/lib/components', `${name}.svelte`));
  for (const file of files) {
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
      const target = resolveImport(file, specifier);
      if (!files.includes(target)) files.push(target);
    }
  }
  return files;
}

/** The stylesheet, compiled. */
export async function siteStylesheet() {
  const compiler = await compile(readFileSync(theme, 'utf8'), {
    base: dirname(theme),
    loadStylesheet: async (id, base) => {
      const path =
        id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
  // Every word of every file is a candidate, and a word that is no class
  // builds nothing. Angle brackets stay inside a word: `[&>svg]:inline` is a
  // class, and a tag such as `</span>` builds nothing either way.
  return compiler.build(
    blockSources().flatMap((file) => readFileSync(file, 'utf8').split(/[\s"'`{}]+/)),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = await siteStylesheet();
  writeFileSync(join(root, 'dist/site.css'), css);
  /** @param {number} bytes */
  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  console.log(`dist/site.css: ${kb(css.length)}, ${kb(gzipSync(css).length)} gzipped`);
}
