/**
 * The kit's stylesheet for a component test page, which otherwise loads none.
 *
 * A consumer imports theme.css into its Tailwind build, and Tailwind emits the
 * tokens, the base layer and a rule for each class it finds. This compiles the
 * same file with the same Tailwind and builds exactly the classes the mounted
 * markup carries, so a contrast check reads the colors a reader would see.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/experimental-ct-svelte';
import { compile } from 'tailwindcss';

const require = createRequire(import.meta.url);
const theme = fileURLToPath(new URL('../../src/lib/styles/theme.css', import.meta.url));

async function stylesheet(path: string) {
  return { path, base: dirname(path), content: await readFile(path, 'utf8') };
}

let compiler: ReturnType<typeof compile> | undefined;

function kitCompiler() {
  compiler ??= readFile(theme, 'utf8').then((css) =>
    compile(css, {
      base: dirname(theme),
      loadStylesheet: (id, base) =>
        stylesheet(
          id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : resolve(base, id),
        ),
    }),
  );
  return compiler;
}

/**
 * Adds the kit's styles for every class on the page, in the theme it names.
 *
 * A class the markup gains only after a change, such as the variant that hides
 * a folded pane's body, is not on the page yet, so it would get no rule. Each
 * file in `sources` adds every word it holds as a candidate, the way Tailwind
 * scans a consumer's files, and a word that is no class builds nothing.
 */
export async function styleWithKit(page: Page, theme: 'dark' | 'light', sources: string[] = []) {
  const classes = await page.evaluate(() => [
    ...new Set([...document.querySelectorAll('*')].flatMap((el) => [...el.classList])),
  ]);
  for (const source of sources) {
    classes.push(...(await readFile(source, 'utf8')).split(/[\s"'`{}<>]+/));
  }
  const css = (await kitCompiler()).build(classes);
  await page.addStyleTag({ content: css });
  await page.evaluate((t) => {
    if (t === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
  }, theme);
}
