/**
 * The words a browser tab shows for a page, stated once for a whole app.
 *
 * A console rendered its own title element on every page, and each page spelled
 * the suffix after the page name for itself. PageShell already holds the page's
 * name, so an app that states the format once in its root layout gets every
 * PageShell page titled the same way. An app that states none gets no title
 * from the kit at all, and its pages keep whatever they render themselves.
 *
 * Context rather than a module variable: one server process renders pages for
 * every visitor, and a format that reads the request (a tenant's name, say)
 * would otherwise leak from one render into the next.
 */
import { getContext, setContext } from 'svelte';

/** Turns a page's name into the words its browser tab shows. */
export type DocumentTitleFormat = (title: string) => string;

const FORMAT = Symbol('document-title-format');

/**
 * States the format every PageShell below the calling component renders its
 * document title in. Call it while a layout initializes, the way any context
 * is set. A format that reads reactive state is run again when that state
 * changes.
 */
export function setDocumentTitleFormat(format: DocumentTitleFormat): void {
  setContext(FORMAT, format);
}

/** The format a layout above stated, or undefined when none did. */
export function getDocumentTitleFormat(): DocumentTitleFormat | undefined {
  return getContext<DocumentTitleFormat | undefined>(FORMAT);
}
