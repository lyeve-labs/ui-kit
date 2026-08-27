// package.json is the single source of truth for the package version. This
// script derives the exported VERSION constant from it and checks the CHANGELOG
// agrees, so the three cannot drift.
//
// They did drift: package.json sat on one version, the newest CHANGELOG entry
// claimed another, and VERSION was four releases behind, because each lived in a
// different file that a release had to remember to touch. Consumers read VERSION
// to decide whether a feature exists, so a stale one is a wrong answer, not a
// cosmetic mismatch.
//
//   node scripts/sync-version.mjs           rewrite VERSION from package.json
//   node scripts/sync-version.mjs --check   fail instead of rewriting
//
// The check runs in `pnpm build` and again as a unit test, needs no network, and
// is the gate a release passes before the tag is cut.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entryPath = join(root, 'src/lib/index.ts');
const changelogPath = join(root, 'CHANGELOG.md');

const VERSION_LINE = /^(export const VERSION = ')(.*)(';)$/m;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
if (!SEMVER.test(pkgVersion)) {
  fail(`package.json version ${JSON.stringify(pkgVersion)} is not a semver string.`);
}

const entry = readFileSync(entryPath, 'utf8');
const match = entry.match(VERSION_LINE);
if (!match) {
  fail(`no \`export const VERSION = '...'\` line in src/lib/index.ts.`);
}

// An in-progress release may head the file with an Unreleased section, which
// names no version and so cannot disagree with one.
const changelogVersion = (readFileSync(changelogPath, 'utf8').match(/^## \[([^\]]+)\]/gm) ?? [])
  .map((h) => h.slice(4, -1))
  .find((v) => v.toLowerCase() !== 'unreleased');

const problems = [];
if (changelogVersion !== pkgVersion) {
  problems.push(
    `CHANGELOG.md heads at ${changelogVersion ?? '(no version entry)'}, package.json is ${pkgVersion}.\n` +
      `  Add the ${pkgVersion} entry, or set package.json to the version you meant to release.`,
  );
}

if (process.argv.includes('--check')) {
  if (match[2] !== pkgVersion) {
    problems.push(
      `src/lib/index.ts exports VERSION ${match[2]}, package.json is ${pkgVersion}.\n` +
        `  Run \`pnpm version:sync\` to regenerate it.`,
    );
  }
  if (problems.length) fail(problems.join('\n'));
  console.log(`version ${pkgVersion} is consistent across package.json, index.ts and CHANGELOG.md`);
} else {
  if (match[2] !== pkgVersion) {
    writeFileSync(entryPath, entry.replace(VERSION_LINE, `$1${pkgVersion}$3`));
    console.log(`src/lib/index.ts: VERSION ${match[2]} -> ${pkgVersion}`);
  } else {
    console.log(`src/lib/index.ts: VERSION already ${pkgVersion}`);
  }
  // The CHANGELOG is prose, so it is checked and never written.
  if (problems.length) fail(problems.join('\n'));
}

function fail(message) {
  console.error(`version sync: ${message}`);
  process.exit(1);
}
