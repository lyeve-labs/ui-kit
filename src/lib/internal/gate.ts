/**
 * Why a read a page needed did not fill it, as the page learned it from the
 * server's answer. A page never decides how a feature is enabled, which role a
 * route needs or whether the database is up. It maps the answer to one of
 * these states and hands it to GateNotice with its own words.
 */
export type Gate =
  | { state: 'ok' }
  /** The route is not there. */
  | { state: 'absent' }
  /** Not enabled here. The link forward is where it is turned on, when the server names one. */
  | { state: 'locked'; forwardHref: string }
  /**
   * At a capacity ceiling: as many are in use as the server allows, so it
   * refuses one more. The notice draws the page's words for it and offers no
   * link, since only the page knows a way past the ceiling. The numbers are
   * there for the page to put into those words, and either is null when the
   * server did not send it.
   */
  | { state: 'full'; limit: number | null; current: number | null }
  /** The reader's role may not read it, which no retry changes. */
  | { state: 'forbidden' }
  /** Refused for the request rate. The same read succeeds once the window passes. */
  | { state: 'busy' }
  /** The server or its database did not answer. The same read may answer in a moment. */
  | { state: 'unavailable' }
  /** The read failed. The message says so in words that never read as an empty result. */
  | { state: 'error'; message: string };

/** A heading and the sentence under it. */
export interface GateText {
  title: string;
  body: string;
}

/**
 * Every sentence a GateNotice can draw, in the page's own words. The kit holds
 * none of them, so each console says a refusal its own way and in its own
 * language.
 */
export interface GateWords {
  /** What a missing route means for this page. */
  absent: string;
  /** A capacity ceiling, with the numbers the gate carried already in the body. */
  full: GateText;
  /** A role that may not read it, and who to ask. */
  forbidden: string;
  /** A refusal for the request rate. */
  busy: GateText;
  /** A server or database that did not answer. */
  unavailable: GateText;
  /** The label of the link that asks for the page again. */
  retry: string;
}
