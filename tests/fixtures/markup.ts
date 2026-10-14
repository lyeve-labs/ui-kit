import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Markup as a browser draws it, for comparing a render with a fixture.
 *
 * Svelte's empty block anchors render nothing, and a run of white space
 * between tags collapses to one space, so neither counts as a change to what
 * the reader sees. An id from $props.id() counts up across a test file, so
 * each one is replaced with the same placeholder and only its place is
 * compared.
 */
export function drawn(html: string): string {
  return html
    .replace(/<!---->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(["\s])c\d+(?=["-])/g, '$1cN')
    .trim();
}

/** A fixture file from this directory, by name. */
export function fixture(name: string): string {
  return readFileSync(join(__dirname, name), 'utf8');
}
