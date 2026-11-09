/**
 * Reading and filling a form through the kit's controls.
 *
 * A FormAssist provides a context, and every control that posts a value
 * registers with it through `assistField`, the same function a control the
 * kit does not ship calls. The form's controller describes the registered
 * fields and puts suggested values into them. A suggestion stays pending
 * until the person accepts it, rejects it or changes the field, and the form
 * refuses to submit while one is pending, so nothing a person has not
 * reviewed is ever posted.
 */
import { getContext, setContext, tick, untrack } from 'svelte';

/**
 * The shape of the value a field holds, which is also the shape a suggestion
 * for it must have.
 *
 * - `text` and `multiline`: a string
 * - `number`: a finite number
 * - `boolean`: true or false
 * - `choice`: one option's value
 * - `choices`: an array of option values
 * - `date`: `YYYY-MM-DD`
 * - `datetime`: `YYYY-MM-DDTHH:mm`, with `:ss` when the control shows seconds
 * - `time`: `HH:mm`, with `:ss` when the control shows seconds
 * - `color`: `#RRGGBB` in upper case, or a swatch's value
 * - `secret` and `file`: withheld, never read and never filled
 */
export type AssistKind =
  | 'text'
  | 'multiline'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'choices'
  | 'date'
  | 'datetime'
  | 'time'
  | 'color'
  | 'secret'
  | 'file';

/** A value a field holds or a suggestion offers. */
export type AssistValue = string | number | boolean | string[] | null;

/** One option of a choice control, as the controller describes it. */
export interface AssistOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * What a control tells its FormAssist about itself.
 *
 * Every member is read when it is needed, so a control passes getters over
 * its props and the description follows them. `value` is a getter and a
 * setter pair over the control's own bindable value.
 */
export interface AssistFieldSpec {
  /** The key the control posts. A control without one does not register. */
  readonly name: string | undefined;
  readonly label: string | undefined;
  readonly hint?: string | undefined;
  readonly kind: AssistKind;
  readonly required?: boolean;
  /** Withholds the field even when its kind does not. The `noAI` prop. */
  readonly noAI?: boolean;
  readonly options?: readonly AssistOption[] | undefined;
  /** A further test the value must pass, such as a minimum or a maximum. */
  accepts?(value: AssistValue): boolean;
  value: AssistValue;
}

/** What a control reads back to draw itself. */
export interface AssistField {
  /** The field holds a suggestion the person has not reviewed. */
  readonly pending: boolean;
  /**
   * Draw the control in the suggested tone. True while the field is pending,
   * and on an option inside a group that is.
   */
  readonly suggested: boolean;
  /** The field's label, for the accept and reject buttons' names. */
  readonly label: string;
  accept(): void;
  reject(): void;
}

/** A registered field, described for whoever fills the form. */
export type AssistFieldDescription =
  | {
      withheld: false;
      name: string;
      label: string;
      hint?: string;
      kind: AssistKind;
      required: boolean;
      options?: AssistOption[];
      value: AssistValue;
      /** The person changed the field, so a suggestion never overwrites it. */
      edited: boolean;
      /** The suggestion waiting for the person, when there is one. */
      suggestion?: AssistValue;
    }
  | {
      /** A password, a file or a field marked `noAI`: its value is never reported. */
      withheld: true;
      label: string;
      kind: AssistKind;
    };

/** Why a suggested value did not go into its field. */
export type AssistSkipReason = 'edited' | 'withheld' | 'unknown' | 'invalid';

export interface AssistSuggestResult {
  /** The names that now hold a pending suggestion. */
  applied: string[];
  skipped: { name: string; reason: AssistSkipReason }[];
}

export interface AssistPending {
  name: string;
  label: string;
  value: AssistValue;
}

/** Reads and fills one FormAssist. */
export interface FormAssistController {
  /** The form's name, such as "New key". */
  readonly label: string;
  describe(): AssistFieldDescription[];
  /** Puts each value into the field of that name, by the field's rules. */
  suggest(values: Record<string, AssistValue>): AssistSuggestResult;
  /** False when no field of that name holds a pending suggestion. */
  accept(name: string): boolean;
  reject(name: string): boolean;
  acceptAll(): void;
  rejectAll(): void;
  pending(): AssistPending[];
}

/** A form on screen, as the page-level registry lists it. */
export interface AssistForm {
  readonly label: string;
  readonly controller: FormAssistController;
  /** The FormAssist's root, to tell a form in an open dialog from the page's. */
  readonly element: HTMLElement;
}

const KEY = Symbol('form-assist');

type Context = { form: FormState } | { field: FieldEntry };

/** Two values are one value when they serialize the same, arrays included. */
function key(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function copy(value: AssistValue): AssistValue {
  return Array.isArray(value) ? [...value] : value;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

/** A calendar day that exists, so February 30 is refused rather than rolled over. */
export function isDay(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return (
    day.getUTCFullYear() === +m[1] && day.getUTCMonth() === +m[2] - 1 && day.getUTCDate() === +m[3]
  );
}

export function isTime(value: string): boolean {
  return TIME.test(value);
}

export function isDateTime(value: string): boolean {
  const [day, time, extra] = value.split('T');
  return extra === undefined && time !== undefined && isDay(day) && isTime(time);
}

/** Whether a control of this kind can hold the value, before its own rules. */
function holds(kind: AssistKind, value: AssistValue, options: readonly AssistOption[]): boolean {
  const offered = (v: unknown) => options.some((o) => o.value === v && !o.disabled);
  switch (kind) {
    case 'text':
    case 'multiline':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'choice':
      return typeof value === 'string' && offered(value);
    case 'choices':
      return Array.isArray(value) && new Set(value).size === value.length && value.every(offered);
    case 'date':
      return typeof value === 'string' && (value === '' || isDay(value));
    case 'datetime':
      return typeof value === 'string' && (value === '' || isDateTime(value));
    case 'time':
      return typeof value === 'string' && (value === '' || isTime(value));
    case 'color':
      return typeof value === 'string' && (/^#[0-9A-F]{6}$/.test(value) || offered(value));
    default:
      return false;
  }
}

const INERT: AssistField = {
  pending: false,
  suggested: false,
  label: '',
  accept() {},
  reject() {},
};

class FieldEntry implements AssistField {
  readonly #spec: AssistFieldSpec;
  readonly #form: FormState;
  pending = $state(false);
  edited = $state(false);
  #suggestion: AssistValue = null;
  #before: AssistValue = null;
  /** The value the field held when last seen, so a change can be told apart from a write. */
  #seen: string | undefined;

  constructor(spec: AssistFieldSpec, form: FormState) {
    this.#spec = spec;
    this.#form = form;
  }

  get name(): string | undefined {
    return this.#spec.name;
  }

  get label(): string {
    return this.#spec.label ?? this.#spec.name ?? '';
  }

  get suggested(): boolean {
    return this.pending;
  }

  get withheld(): boolean {
    return this.#spec.kind === 'secret' || this.#spec.kind === 'file' || !!this.#spec.noAI;
  }

  describe(): AssistFieldDescription {
    const s = this.#spec;
    if (this.withheld) return { withheld: true, label: this.label, kind: s.kind };
    return {
      withheld: false,
      name: s.name ?? '',
      label: this.label,
      ...(s.hint ? { hint: s.hint } : {}),
      kind: s.kind,
      required: !!s.required,
      ...(s.options ? { options: s.options.map((o) => ({ ...o })) } : {}),
      value: copy($state.snapshot(s.value) as AssistValue),
      edited: this.edited,
      ...(this.pending ? { suggestion: copy(this.#suggestion) } : {}),
    };
  }

  /** Why the value cannot go in, or undefined when it can. */
  refusal(value: AssistValue): AssistSkipReason | undefined {
    if (this.withheld) return 'withheld';
    if (this.edited) return 'edited';
    const s = this.#spec;
    if (!holds(s.kind, value, s.options ?? [])) return 'invalid';
    if (s.accepts && !s.accepts(value)) return 'invalid';
    return undefined;
  }

  offer(value: AssistValue) {
    if (!this.pending) this.#before = copy($state.snapshot(this.#spec.value) as AssistValue);
    this.#write(copy(value));
    this.#suggestion = copy(value);
    this.pending = true;
  }

  accept() {
    if (!this.pending) return;
    this.pending = false;
    this.#suggestion = null;
  }

  reject() {
    if (!this.pending) return;
    this.#write(this.#before);
    this.pending = false;
    this.#suggestion = null;
  }

  get suggestion(): AssistValue {
    return this.#suggestion;
  }

  #write(value: AssistValue) {
    this.#spec.value = value;
    // Read back rather than keep what was written: a control may store the
    // value in its own form, and that form is what the next change compares to.
    this.#seen = key($state.snapshot(this.#spec.value));
  }

  /** Called with each value the control holds. A change nothing here wrote is the person's. */
  observe(now: string) {
    if (this.#seen === undefined || now === this.#seen) {
      this.#seen = now;
      return;
    }
    this.#seen = now;
    this.edited = true;
    if (this.pending) {
      this.pending = false;
      this.#suggestion = null;
    }
    this.#form.changed();
  }
}

/** A control inside a registered one, such as a group's option: it paints, and never registers. */
class Nested implements AssistField {
  readonly #owner: FieldEntry;
  constructor(owner: FieldEntry) {
    this.#owner = owner;
  }
  get pending() {
    return false;
  }
  get suggested() {
    return this.#owner.pending;
  }
  get label() {
    return this.#owner.label;
  }
  accept() {}
  reject() {}
}

/** The sentence the bar shows, and the one announced when suggestions arrive. */
export function suggestsSentence(count: number): string {
  return count === 1
    ? 'The assistant suggests a value. Accept, reject or change it.'
    : `The assistant suggests ${count} values. Accept, reject or change each one.`;
}

/** The sentence the bar shows after a submit it held. */
export function heldSentence(count: number): string {
  return count === 1
    ? 'Accept or reject the suggested value before you save.'
    : `Accept or reject the ${count} suggested values before you save.`;
}

export class FormState implements FormAssistController {
  readonly #label: () => string;
  fields = $state.raw<FieldEntry[]>([]);
  /** A submit was refused while suggestions were pending. */
  held = $state(false);
  /** The polite announcement, written once per batch of suggestions. */
  announcement = $state('');

  constructor(label: () => string) {
    this.#label = label;
  }

  get label(): string {
    return this.#label();
  }

  get count(): number {
    return this.fields.filter((f) => f.pending).length;
  }

  add(field: FieldEntry): () => void {
    untrack(() => (this.fields = [...this.fields, field]));
    return () => {
      untrack(() => (this.fields = this.fields.filter((f) => f !== field)));
      this.changed();
    };
  }

  /**
   * Clears the held state once nothing is pending, so the next submit goes
   * through untouched and a stale announcement is not read again.
   */
  changed() {
    if (untrack(() => this.count) > 0) return;
    this.held = false;
    this.announcement = '';
  }

  #find(name: string): FieldEntry | undefined {
    return this.fields.find((f) => f.name === name);
  }

  describe(): AssistFieldDescription[] {
    return this.fields.map((f) => f.describe());
  }

  suggest(values: Record<string, AssistValue>): AssistSuggestResult {
    const result: AssistSuggestResult = { applied: [], skipped: [] };
    for (const [name, value] of Object.entries(values)) {
      const field = this.#find(name);
      const reason = field ? field.refusal(value) : 'unknown';
      if (reason || !field) {
        result.skipped.push({ name, reason: reason ?? 'unknown' });
        continue;
      }
      field.offer(value);
      result.applied.push(name);
    }
    if (result.applied.length > 0) {
      this.held = false;
      // Emptied first, so a second batch of the same size is announced again.
      const sentence = suggestsSentence(this.count).split('. ')[0] + '.';
      this.announcement = '';
      void tick().then(() => (this.announcement = sentence));
    }
    return result;
  }

  accept(name: string): boolean {
    const field = this.#find(name);
    if (!field?.pending) return false;
    field.accept();
    this.changed();
    return true;
  }

  reject(name: string): boolean {
    const field = this.#find(name);
    if (!field?.pending) return false;
    field.reject();
    this.changed();
    return true;
  }

  acceptAll() {
    for (const f of this.fields) f.accept();
    this.changed();
  }

  rejectAll() {
    for (const f of this.fields) f.reject();
    this.changed();
  }

  pending(): AssistPending[] {
    return this.fields
      .filter((f) => f.pending)
      .map((f) => ({ name: f.name ?? '', label: f.label, value: copy(f.suggestion) }));
  }
}

/** Starts a form's state and hands it to the controls below. FormAssist calls it. */
export function provideAssistForm(label: () => string): FormState {
  const form = new FormState(label);
  setContext<Context>(KEY, { form });
  return form;
}

/**
 * Registers a control with the FormAssist around it, and returns what the
 * control draws from.
 *
 * Call it once while the control initializes, as the kit's controls do.
 * Outside a FormAssist it registers nothing and the control draws as it
 * always has. A control inside a registered one, such as a group's option,
 * paints with its group and does not register on its own. The field joins
 * the form in an effect, so a server render registers nothing.
 */
export function assistField(spec: AssistFieldSpec): AssistField {
  const context = getContext<Context | undefined>(KEY);
  if (!context) return INERT;
  if ('field' in context) return new Nested(context.field);

  const form = context.form;
  const field = new FieldEntry(spec, form);
  setContext<Context>(KEY, { field });

  $effect(() => {
    if (!spec.name) return;
    return untrack(() => form.add(field));
  });
  $effect(() => {
    const now = key($state.snapshot(spec.value));
    untrack(() => field.observe(now));
  });
  return field;
}

/** How a control that only ever sits inside another one learns its tone. */
export function assistTone(): AssistField {
  const context = getContext<Context | undefined>(KEY);
  return context && 'field' in context ? new Nested(context.field) : INERT;
}

let registry = $state.raw<AssistForm[]>([]);

/**
 * Lists a form for the page. Called from an effect, never during a server
 * render: a module-level list on the server is shared by every request.
 */
export function registerAssistForm(form: AssistForm): () => void {
  // Untracked, so the effect that lists the form does not rerun on the list it changes.
  untrack(() => (registry = [...registry, form]));
  return () => untrack(() => (registry = registry.filter((f) => f !== form)));
}

/** Every form on screen that a FormAssist wraps, in the order they mounted. */
export function assistForms(): readonly AssistForm[] {
  return registry;
}

/**
 * The form a panel beside the page should work on: the newest one inside an
 * open dialog or drawer, else the page's form that holds focus, else the
 * page's first.
 */
export function activeAssistForm(): AssistForm | undefined {
  const inDialog = registry.filter((f) => f.element.closest('[role="dialog"], dialog'));
  if (inDialog.length > 0) return inDialog[inDialog.length - 1];
  const focused = typeof document === 'undefined' ? null : document.activeElement;
  return registry.find((f) => focused && f.element.contains(focused)) ?? registry[0];
}
