/**
 * @vitest-environment node
 *
 * This suite reads build configuration and shells out to a build script, and
 * jsdom breaks esbuild's TextEncoder invariant when the vitest config is
 * loaded. Nothing here touches the DOM.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from 'svelte/compiler';
import vitestConfig from '../../vitest.config.js';

/**
 * The build gates are configuration, and configuration fails silently. Each of
 * these had been green for the whole life of the file while measuring, matching
 * or rejecting nothing at all, so the assertions below are about what each gate
 * actually does rather than what it says.
 */

const ROOT = resolve(__dirname, '../..');

interface SvelteWarning {
  code?: string;
  message?: string;
}

interface SvelteConfig {
  onwarn: (warning: SvelteWarning, handler?: (warning: SvelteWarning) => void) => void;
}

/**
 * Loaded through a computed URL rather than a static import.
 *
 * tsconfig checks JS, and a static import would pull the untyped config into
 * the program and fail `svelte-check` on its own parameters.
 */
async function svelteConfig(): Promise<SvelteConfig> {
  const url = pathToFileURL(join(ROOT, 'svelte.config.js')).href;
  const mod = (await import(/* @vite-ignore */ url)) as { default: SvelteConfig };
  return mod.default;
}

describe('the a11y gate in svelte.config.js', () => {
  it('rejects the snake_case codes Svelte 5 emits', async () => {
    // The predicate tested `startsWith('a11y-')`. Svelte 5 renamed every code
    // to snake_case, so the gate matched nothing and had never rejected a
    // single warning.
    const { onwarn } = await svelteConfig();
    expect(() => onwarn({ code: 'a11y_autofocus', message: 'Avoid using autofocus' })).toThrow(
      /a11y violation/,
    );
  });

  it('still rejects the hyphenated codes older tooling emits', async () => {
    const { onwarn } = await svelteConfig();
    expect(() => onwarn({ code: 'a11y-autofocus', message: 'Avoid using autofocus' })).toThrow(
      /a11y violation/,
    );
  });

  it('passes everything else to the default handler', async () => {
    const { onwarn } = await svelteConfig();
    const seen: SvelteWarning[] = [];
    onwarn({ code: 'unused_export_let', message: 'unused' }, (w) => seen.push(w));
    expect(seen.map((w) => w.code)).toEqual(['unused_export_let']);
  });

  it('survives a warning that carries no code', async () => {
    const { onwarn } = await svelteConfig();
    expect(() => onwarn({ message: 'no code' })).not.toThrow();
  });

  it('fires on a warning the compiler really produces', async () => {
    // The codes above are hand-written. This one comes out of the compiler, so
    // the gate is pinned to the spelling Svelte actually uses and not to a
    // string this test invented.
    const { warnings } = compile('<input autofocus />', { filename: 'fixture.svelte' });
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain('a11y_autofocus');

    const { onwarn } = await svelteConfig();
    expect(() => {
      for (const warning of warnings) onwarn(warning);
    }).toThrow(/a11y violation/);
  });
});

describe('coverage measures the shipped tree', () => {
  const coverage = vitestConfig.test?.coverage;

  it('measures src/lib and nothing else', () => {
    // With no include, the report covered whatever a test happened to load.
    expect(coverage && 'include' in coverage ? coverage.include : undefined).toEqual([
      'src/lib/**',
    ]);
  });

  it('keeps the defaults a user-supplied exclude would have replaced', () => {
    // In vitest 2 `exclude` replaces the default list rather than extending it,
    // so the previous three-entry list put node_modules straight back into the
    // measured tree.
    const exclude = coverage && 'exclude' in coverage ? (coverage.exclude ?? []) : [];
    expect(exclude).toContain('**/node_modules/**');
    expect(exclude).toContain('dist/**');
    expect(exclude).toContain('tests/**');
    expect(exclude).toContain('src/**/*.{test,spec}.{js,ts}');
  });
});

describe('the component suite points at its specs', () => {
  const config = readFileSync(join(ROOT, 'playwright-ct.config.ts'), 'utf8');
  const testDir = /testDir:\s*'([^']+)'/.exec(config)?.[1];
  const testMatch = /testMatch:\s*'([^']+)'/.exec(config)?.[1];

  function specsUnder(dir: string): string[] {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    return walk(dir).filter((p) => p.endsWith('.ct.spec.ts'));
  }

  it('names a directory that actually holds ct specs', () => {
    // testDir was './src' while every spec lived in tests/ct, so the runner
    // collected zero tests and reported success on every run.
    expect(testDir).toBeDefined();
    expect(testMatch).toBe('**/*.ct.spec.ts');
    expect(specsUnder(join(ROOT, testDir!)).length).toBeGreaterThan(0);
  });

  it('does not point at the tree the specs were moved out of', () => {
    expect(testDir).not.toBe('./src');
    expect(specsUnder(join(ROOT, 'src'))).toEqual([]);
  });

  it('is reachable through a named script', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['test:ct']).toContain('playwright-ct.config.ts');
    expect(pkg.scripts['test:coverage']).toContain('--coverage');
  });
});

describe('the dist check sees a broken relative import', () => {
  const script = join(ROOT, 'scripts', 'check-dist.mjs');

  /** Builds a throwaway package whose dist holds exactly the given files. */
  function fixture(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'ui-kit-dist-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@lyeve-labs/ui-kit' }));
    for (const [name, body] of Object.entries(files)) {
      const path = join(dir, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
    }
    return dir;
  }

  function run(dir: string): { code: number; output: string } {
    try {
      // stderr is piped rather than inherited: the failing fixtures below are
      // meant to fail, and their output is not this suite's output.
      const stdio: ('ignore' | 'pipe')[] = ['ignore', 'pipe', 'pipe'];
      return {
        code: 0,
        output: execFileSync('node', [script], { cwd: dir, encoding: 'utf8', stdio }),
      };
    } catch (e) {
      const err = e as { status?: number; stderr?: string };
      return { code: err.status ?? 1, output: err.stderr ?? '' };
    }
  }

  it('fails when the internal directory is missing from the build output', () => {
    // A published release shipped a dist with no internal/ at all. Every
    // component threw ERR_MODULE_NOT_FOUND on first import and this check,
    // which only matched specifiers starting with '@lyeve', passed.
    const dir = fixture({
      'dist/components/Input.svelte': "import { x } from '../internal/field.js';",
    });
    const { code, output } = run(dir);
    expect(code).toBe(1);
    expect(output).toContain('../internal/field.js');
  });

  it('passes when the file the specifier names is there', () => {
    const dir = fixture({
      'dist/components/Input.svelte': "import { x } from '../internal/field.js';",
      'dist/internal/field.js': 'export const x = 1;',
    });
    expect(run(dir).code).toBe(0);
  });

  it('resolves a .js specifier to the .svelte sibling svelte-package emits', () => {
    // index.js imports './components/Card.svelte'; a component importing a
    // neighbour writes the .js extension TypeScript would emit. Both ship.
    const dir = fixture({
      'dist/index.js': "export { default } from './components/Card.js';",
      'dist/components/Card.svelte': '<div></div>',
    });
    expect(run(dir).code).toBe(0);
  });

  it('resolves an extensionless rune module to its published .svelte.js', () => {
    const dir = fixture({
      'dist/components/Toaster.svelte': "import { toast } from '../stores/toast.svelte';",
      'dist/stores/toast.svelte.js': 'export const toast = 1;',
    });
    expect(run(dir).code).toBe(0);
  });

  it('ignores a specifier quoted inside a colocated test', () => {
    // Tests are excluded from the tarball by the `files` field, and they quote
    // specifiers inside assertions, which reads as an import to any regex.
    const dir = fixture({
      'dist/consistency.test.js': `expect(src).toContain("from '../internal/field.js'");`,
    });
    expect(run(dir).code).toBe(0);
  });
});
