// Fails the build when dist references a @lyeve* package that is not this
// package itself and not a declared dependency. Catches the case that shipped
// broken 0.1.x/0.2.x tarballs: a scope rename landed in src but the published
// artifact still imported the retired @lyeve-labs/* packages, so consumers hit
// ERR_MODULE_NOT_FOUND on first import.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const declared = new Set([
  pkg.name,
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);

// Sourcemaps embed the original source text, so a stale specifier there is
// cosmetic. Only emitted code and type declarations can break a consumer.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : join(dir, e.name),
  );
}

const files = walk('dist').filter((f) => !f.endsWith('.map'));
const specifier = /(?:from|require\()\s*["'](@lyeve[^"']*)["']/g;
const bad = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const [, spec] of src.matchAll(specifier)) {
    if (!declared.has(spec)) bad.push(`${file}: ${spec}`);
  }
}

if (bad.length) {
  console.error(`${pkg.name}: dist imports undeclared @lyeve packages:`);
  for (const line of [...new Set(bad)]) console.error(`  ${line}`);
  console.error('Declare them in dependencies/peerDependencies, or fix the import.');
  process.exit(1);
}

// The scan above only ever matched a specifier starting with the literal
// '@lyeve', so the far more common break was invisible to it. svelte-package
// copies preprocessed .svelte files into dist verbatim, which means a component
// importing '../internal/listbox.js' ships that exact path and the file has to
// be there. A release went out with no dist/internal directory at all: every
// component threw ERR_MODULE_NOT_FOUND on first import and the check passed.
//
// Colocated tests are excluded by the `files` field, so they never reach a
// consumer. They also quote specifiers inside assertions, which reads as an
// import to any regex.
const shipped = files.filter((f) => !/\.(test|spec)\.[^.]+$/.test(f));
const relative = /from\s*["'](\.[^"']*)["']/g;
const missing = [];

/**
 * Every on-disk path a specifier may legitimately resolve to in this layout.
 *
 * TypeScript writes the extension it would emit, so '.js' is how a neighbour
 * names a component that ships as '.svelte'. A rune module is authored as
 * 'toast.svelte.ts', imported as './toast.svelte' with no extension at all, and
 * published as 'toast.svelte.js'. Taking the specifier literally and nothing
 * else would fail every one of those.
 */
function candidates(path) {
  if (path.endsWith('.js')) return [path, `${path.slice(0, -3)}.svelte`];
  if (path.endsWith('.svelte')) return [path, `${path}.js`];
  return [path];
}

for (const file of shipped) {
  const src = readFileSync(file, 'utf8');
  const dir = dirname(file);
  for (const [, spec] of src.matchAll(relative)) {
    const literal = join(dir, spec);
    if (!candidates(literal).some((candidate) => existsSync(candidate))) {
      missing.push(`${file}: ${spec}`);
    }
  }
}

if (missing.length) {
  console.error(`${pkg.name}: dist has relative imports that resolve to nothing:`);
  for (const line of [...new Set(missing)]) console.error(`  ${line}`);
  console.error('The file is missing from the build output, or the specifier is wrong.');
  process.exit(1);
}
