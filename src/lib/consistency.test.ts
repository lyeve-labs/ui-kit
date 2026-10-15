import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The library drifted because nothing measured it. Every component was correct
 * on its own terms and wrong beside its neighbor: three focus treatments, two
 * wrapper gaps, two error-border opacities, two control heights, and icons
 * drawn as Unicode characters in some components and stroked SVG in others.
 *
 * These tests read the source rather than the rendered output, because the
 * defect is not what any single component does: it is the disagreement between
 * them. A rendering test would have to be written once per component and would
 * pass just as happily on the state that shipped.
 */

const COMPONENTS = join(__dirname, 'components');

function componentFiles(): { name: string; path: string; src: string }[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  return walk(COMPONENTS)
    .filter((p) => p.endsWith('.svelte'))
    .map((path) => ({
      name: path.slice(COMPONENTS.length + 1).replace(/\.svelte$/, ''),
      path,
      src: readFileSync(path, 'utf8'),
    }));
}

const files = componentFiles();

/** Controls a user types into or picks from. They share one visual contract. */
const FIELDS = [
  'Input',
  'Select',
  'Textarea',
  'NumberInput',
  'SearchInput',
  'FileInput',
  'Autocomplete',
  'MultiSelect',
  'DatePicker',
];

/**
 * Source with every comment taken out. A guard that reads the raw file counts
 * the prose explaining a decision as the decision: the first draft of the
 * required-marker guard passed on a component whose attribute had been deleted,
 * because the comment above it still spelled the attribute's name.
 */
function code(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The implicit ARIA role of the host elements the kit hangs aria-* on. */
const IMPLICIT_ROLE: Record<string, string> = {
  button: 'button',
  fieldset: 'group',
  input: 'textbox',
  select: 'combobox',
  textarea: 'textbox',
  div: 'generic',
  span: 'generic',
};

/**
 * The role each `aria-required` in a source sits on, in source order.
 *
 * The element's own `role` attribute when it has one, its implicit role
 * otherwise, so a fieldset counts as the group it is. The tag is read to its
 * closing `>` at brace depth zero: an attribute value holds `=>` and `>` of its
 * own, and stopping at the first one would take the role of whatever element
 * the scan happened to land in.
 */
function ariaRequiredRoles(src: string): string[] {
  const roles: string[] = [];
  for (let i = src.indexOf('aria-required'); i !== -1; i = src.indexOf('aria-required', i + 1)) {
    const open = src.lastIndexOf('<', i);
    const name = /^<([a-zA-Z][\w-]*)/.exec(src.slice(open))?.[1];
    if (name === undefined) continue;
    let depth = 0;
    let quote = '';
    let end = open + 1;
    for (; end < src.length; end++) {
      const c = src[end];
      if (quote !== '') {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '{') {
        depth += 1;
      } else if (c === '}') {
        depth -= 1;
      } else if (c === '>' && depth === 0) {
        break;
      }
    }
    const tag = src.slice(open, end);
    roles.push(/\brole="([a-z]+)"/.exec(tag)?.[1] ?? IMPLICIT_ROLE[name] ?? name);
  }
  return roles;
}

/**
 * Every opening tag of an HTML element, read to its closing bracket with
 * braces and quotes honored, so an arrow function inside an attribute does
 * not end the tag early.
 */
function openingTags(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/<[a-z]/g)) {
    let depth = 0;
    let quote = '';
    let end = m.index + 1;
    for (; end < src.length; end++) {
      const c = src[end];
      if (quote !== '') {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '{') {
        depth += 1;
      } else if (c === '}') {
        depth -= 1;
      } else if (c === '>' && depth === 0) {
        break;
      }
    }
    out.push(src.slice(m.index, end + 1));
  }
  return out;
}

/** An element of a component's markup, with the element it sits inside. */
interface MarkupElement {
  name: string;
  tag: string;
  parent: MarkupElement | undefined;
}

const VOID = new Set([
  'area',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'wbr',
]);

/**
 * Every element of a component's markup, components included, each with its
 * parent, so a rule can ask what an element sits inside rather than what the
 * file holds somewhere. The script and style blocks are dropped and a `{...}`
 * expression in the text is skipped whole, so a `<` in either opens nothing.
 */
function markupElements(source: string): MarkupElement[] {
  const src = code(source)
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/g, '');
  const out: MarkupElement[] = [];
  const open: MarkupElement[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '{') {
      let depth = 0;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}' && --depth === 0) break;
      }
      i += 1;
      continue;
    }
    if (c !== '<') {
      i += 1;
      continue;
    }
    const closing = /^<\/([A-Za-z][\w:.-]*)\s*>/.exec(src.slice(i));
    if (closing !== null) {
      const at = open.map((e) => e.name).lastIndexOf(closing[1]);
      if (at !== -1) open.length = at;
      i += closing[0].length;
      continue;
    }
    const name = /^<([A-Za-z][\w:.-]*)/.exec(src.slice(i))?.[1];
    if (name === undefined) {
      i += 1;
      continue;
    }
    let depth = 0;
    let quote = '';
    let end = i + 1;
    for (; end < src.length; end++) {
      const ch = src[end];
      if (quote !== '') {
        if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
      } else if (ch === '>' && depth === 0) {
        break;
      }
    }
    const tag = src.slice(i, end + 1);
    const element = { name, tag, parent: open.at(-1) };
    out.push(element);
    if (!tag.endsWith('/>') && !VOID.has(name)) open.push(element);
    i = end + 1;
  }
  return out;
}

/** The text of an element's class attribute, quoted or an expression, or ''. */
function classOf(tag: string): string {
  const at = /\sclass=(["{])/.exec(tag);
  if (at === null) return '';
  const start = at.index + at[0].length;
  if (at[1] === '"') return tag.slice(start, tag.indexOf('"', start));
  let depth = 1;
  let end = start;
  for (; end < tag.length && depth > 0; end++) {
    if (tag[end] === '{') depth += 1;
    else if (tag[end] === '}') depth -= 1;
  }
  return tag.slice(start, end - 1);
}

/**
 * Whether an element answers a selector a `has-[...]` variant names: a tag
 * name, attribute tests, or both, read from the element's own tag. A spread
 * of attributes is not read, so an element styled by one does not match.
 */
function matchesSelector(element: MarkupElement, selector: string): boolean {
  const m = /^>?([a-z][\w-]*)?((?:\[[^\]]+\])*)$/.exec(selector);
  if (m === null || (m[1] === undefined && m[2] === '')) return false;
  if (m[1] !== undefined && m[1] !== element.name) return false;
  return [...m[2].matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g)].every(([, attr, value]) =>
    value === undefined
      ? new RegExp(`\\s${attr}(?=[\\s=/>])`).test(element.tag)
      : new RegExp(`\\s${attr}="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(
          element.tag,
        ),
  );
}

/**
 * The class text of every element that turns its outline off with no 2px
 * ring to replace it. An element passes on its own focus-visible ring, or on
 * the ring a wrapper draws for it through has-[...:focus-visible]:ring-2,
 * where the wrapper is one of its ancestors and the selector picks it out.
 */
function outlinesWithoutRing(src: string): string[] {
  const ringFor = (element: MarkupElement): boolean => {
    for (let up = element.parent; up !== undefined; up = up.parent) {
      for (const [, selector] of classOf(up.tag).matchAll(/has-\[(\S+?):focus-visible\]:ring-2/g)) {
        if (selector.startsWith('>') && up !== element.parent) continue;
        if (matchesSelector(element, selector)) return true;
      }
    }
    return false;
  };
  return markupElements(src)
    .map((element) => ({ element, cls: classOf(element.tag).replace(/\s+/g, ' ') }))
    .filter(({ cls }) => /(?<![\w:-])outline-none(?![\w-])/.test(cls))
    .filter(({ element, cls }) => !cls.includes('focus-visible:ring-2') && !ringFor(element))
    .map(({ cls }) => cls);
}

/**
 * Every lucide icon a component draws, by the name it imported the icon
 * under. Reads every import of the package: named, default from an icon
 * path, or a namespace.
 */
function lucideIcons(src: string): MarkupElement[] {
  const names = new Set<string>();
  const namespaces: string[] = [];
  for (const [, list] of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@lucide\/svelte['"]/g)) {
    for (const part of list.split(',').map((p) => p.trim())) {
      if (part !== '' && !part.startsWith('type ')) names.add(part.split(/\s+as\s+/).pop()!);
    }
  }
  for (const [, n] of src.matchAll(
    /import\s+(\w+)\s+from\s*['"]@lucide\/svelte\/icons\/[^'"]+['"]/g,
  )) {
    names.add(n);
  }
  for (const [, n] of src.matchAll(/import\s*\*\s*as\s+(\w+)\s+from\s*['"]@lucide\/svelte['"]/g)) {
    namespaces.push(n);
  }
  return markupElements(src).filter(
    (e) => names.has(e.name) || namespaces.some((ns) => e.name.startsWith(`${ns}.`)),
  );
}

/** Every lucide icon a component sizes with a class, quoted or an expression. */
function iconsSizedByClass(src: string): string[] {
  return lucideIcons(src)
    .filter((e) => /\b(?:w|h|size)-\d/.test(classOf(e.tag)))
    .map((e) => e.name);
}

/** The five sizes an icon may take, the ladder each console names in its icon.ts. */
const ICON_LADDER = [12, 14, 16, 20, 40];

/**
 * Every lucide icon whose size is a number off the ladder, with that number.
 * An icon with no size draws at lucide's 24. A size held in a variable is
 * not read here, so a component passing one owns keeping it on the ladder.
 */
function iconsOffLadder(src: string): string[] {
  return lucideIcons(src).flatMap((e) => {
    const literal = /\ssize=(?:\{\s*([\d.]+)\s*\}|"([\d.]+)")/.exec(e.tag);
    const dynamic = /\ssize=\{|\s\{size\}|\{\.\.\./.test(e.tag);
    if (literal === null && dynamic) return [];
    const size = literal === null ? 24 : Number(literal[1] ?? literal[2]);
    return ICON_LADDER.includes(size) ? [] : [`${e.name} ${size}`];
  });
}

/**
 * The top-level elements of a component that do not leave through a preset.
 * A component that dismisses itself takes those elements off the screen, so
 * each one owes the exit, and a preset elsewhere in the file plays nothing
 * when it goes.
 */
function surfacesWithoutExit(src: string): string[] {
  return markupElements(src)
    .filter((e) => e.parent === undefined && /^[a-z]/.test(e.name) && !e.name.includes(':'))
    .filter((e) => !/\stransition:motion\.[a-z]+\|global\b/.test(e.tag))
    .map((e) => e.tag.slice(0, 60).replace(/\s+/g, ' '));
}

/** The asterisk a component draws beside a label when the field is required. */
const REQUIRED_MARKER = /\{#if required\}\s*<span/;

/**
 * The two components that draw the marker for a control they do not own. Field
 * hands its wiring to a snippet the caller fills. Label sits beside whatever the
 * caller wrote. Neither can set the attribute, so both say so in the prop doc
 * and the caller sets it.
 */
const NO_CONTROL_OF_THEIR_OWN = ['Field', 'Label'];

/**
 * Portalled overlays own the whole viewport, so `class` has no unambiguous
 * target on them. Everything else is placed by the consumer and must accept one.
 */
const PORTALLED = [
  'Drawer',
  'Modal',
  'Toaster',
  'dialog/Dialog',
  'dialog/DialogContainer',
  'dialog/ConfirmDialog',
];

describe('component consistency', () => {
  it('finds every component', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('renders no control whose popup or face the browser draws', () => {
    // A native select opens a list the operating system paints, in its own
    // font and highlight color, and no stylesheet reaches it. It opened white
    // on a dark checkout. Date, time, color and range inputs do the same, and
    // the kit ships its own picker for each that a product needs.
    const NATIVE =
      /<select\b|<option\b|<optgroup\b|<datalist\b|type="(date|time|datetime-local|month|week|color|range)"/;
    const offenders = files.filter((f) => NATIVE.test(code(f.src))).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('sizes every lucide icon by its size prop, never by a class', () => {
    // A lucide icon draws at 24px and a w-* or h-* class rescales it, which
    // reads as styling rather than as a rung of the icon ladder and is how
    // the dialog stack's close cross and the confirm dialog's warning sign
    // came to sit off it.
    const offenders = files.flatMap((f) => iconsSizedByClass(f.src).map((n) => `${f.name}: ${n}`));
    expect(offenders).toEqual([]);
  });

  it('draws every lucide icon at a rung of the icon ladder', () => {
    // The consoles size icons from five rungs and the kit drew its own at 15
    // and 18, so an eye in a password field sat a pixel off the row action
    // beside it and the sidebar toggle two pixels under the menu button it
    // replaces.
    const offenders = files.flatMap((f) => iconsOffLadder(f.src).map((n) => `${f.name}: ${n}`));
    expect(offenders).toEqual([]);
  });

  it('draws icons as stroked SVG, never as a Unicode character', () => {
    // A literal × or ✓ renders at whatever weight the user's font gives it,
    // which sat visibly lighter than the SVG icons next to it.
    const offenders = files.filter((f) => /[×−✓ℹ]/.test(f.src)).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('states the control height as a token, not as a literal', () => {
    // h-9 (36px) against the 38px every other control resolved to is what made
    // a NumberInput sit two pixels short of the Input beside it.
    const offenders = files
      .filter((f) => /\bh-9\b|min-h-\[|\bh-\[2\.375rem\]/.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('gives every control one focus border, at full strength', () => {
    const offenders = files
      .filter((f) => /focus:border-brand\/|focus:border-danger\//.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it.each(FIELDS)('%s draws the 2px ring wherever it turns the outline off', (name) => {
    // Input, Select's trigger and Textarea draw the brand ring on focus. A
    // control that writes outline-none and keeps only focus:border-brand
    // shows a keyboard user a 1px color change, which NumberInput, the
    // MultiSelect trigger and both panel search boxes did. A ring on a
    // wrapper, through has-[...:focus-visible], counts for the control inside.
    // The wrapper's ring counts only for the element it is drawn for: one
    // wrapper ring in a file used to excuse every outline-none in it.
    expect(outlinesWithoutRing(files.find((x) => x.name === name)!.src)).toEqual([]);
  });

  it.each(FIELDS)('%s composes its classes from the shared field contract', (name) => {
    const f = files.find((x) => x.name === name);
    expect(f, `${name} not found`).toBeDefined();
    expect(f!.src).toContain("from '../internal/field.js'");
  });

  it.each(FIELDS)('%s spaces its label, control and message identically', (name) => {
    const src = files.find((x) => x.name === name)!.src;
    expect(src).toContain('FIELD_WRAP');
    expect(src).not.toMatch(/class="flex flex-col gap-1 /);
  });

  it.each(FIELDS)('%s offers a label and a hint', (name) => {
    const src = files.find((x) => x.name === name)!.src;
    expect(src, `${name} has no label prop`).toMatch(/label\??:\s*string/);
    // SearchInput is the one field with no message row: it has no error state
    // to report and no hint that a placeholder does not already carry.
    if (name !== 'SearchInput') {
      expect(src, `${name} has no hint prop`).toMatch(/hint\??:\s*string/);
    }
  });

  // MultiSelect's trigger is a chip well: the error belongs to the field and
  // not to any one chip, and its message reaches a screen reader through
  // aria-describedby instead.
  it.each(FIELDS.filter((n) => !['SearchInput', 'MultiSelect'].includes(n)))(
    '%s announces its own error to a screen reader',
    (name) => {
      const src = files.find((x) => x.name === name)!.src;
      expect(src).toContain('aria-invalid');
    },
  );

  it.each(FIELDS.filter((n) => n !== 'SearchInput'))(
    '%s points at whichever message is on screen',
    (name) => {
      const src = files.find((x) => x.name === name)!.src;
      expect(src).toContain('describedBy(');
    },
  );

  it.each(FIELDS.filter((n) => n !== 'SearchInput'))(
    '%s shows an error instead of a hint, never both at once',
    (name) => {
      const src = files.find((x) => x.name === name)!.src;
      expect(src, `${name} stacks its hint under its error`).toContain('{:else if hint}');
    },
  );

  it('lets the consumer position anything that is not a portalled overlay', () => {
    const offenders = files
      .filter((f) => !PORTALLED.includes(f.name))
      .filter((f) => !/class:\s*(klass|cls)\b/.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('spells the label, hint and error classes in exactly one place', () => {
    // Six components repeated these literals. They agreed today. Nothing made
    // them agree tomorrow, and the label class had already drifted once.
    // Scoped to labels and message rows. DatePicker's calendar heading uses the
    // same three utilities and is not a field label, so it is not in scope.
    const offenders = files
      .filter((f) =>
        /"text-xs text-(faint|danger)"|<(label|legend)[^>]*class="text-sm font-medium text-fg"/.test(
          f.src,
        ),
      )
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it("does not let a container clip its own buttons' focus ring", () => {
    // The global :focus-visible outline sits 2px OUTSIDE the element, so a
    // container with overflow-hidden crops it. On the accordion that showed as
    // a stray colored line under the open header: three edges clipped, one
    // left. A component that clips must draw its focus ring inset instead.
    const offenders = files
      .filter((f) => f.src.includes('overflow-hidden') && f.src.includes('<button'))
      .filter((f) => !f.src.includes('focus-visible:ring-inset'))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('scopes a duration to the same elements as the transition it belongs to', () => {
    // `[&_tbody_tr]:transition-colors duration-150` reads as one thought and is
    // not: the bare duration lands on the element carrying the class, so the
    // rows transition with no duration and the table gets a pointless one.
    const offenders = files
      .filter((f) => /\[&[^\]]*\]:transition-[a-z]+ duration-/.test(f.src.replace(/\s+/g, ' ')))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('hides the required marker rather than naming it', () => {
    // Fifteen components spelled the marker `aria-label="required"`. Accessible
    // name computation walks into the label and concatenates what it finds, and
    // an aria-label on a descendant replaces that descendant's text rather than
    // being skipped, so a field labeled Email announced as "Email required".
    // A name is what a voice-control user speaks at the control, and nobody
    // says "Email required". The marker is paint. The state belongs on the
    // control.
    const offenders = files
      .filter((f) => f.src.includes('aria-label="required"'))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('marks every required asterisk aria-hidden', () => {
    // The other half of the same rule. Dropping the aria-label alone leaves the
    // bare "*" in the name, so a field announces as "Email star".
    const offenders = files
      .filter((f) => REQUIRED_MARKER.test(f.src))
      .filter((f) => !/\{#if required\}\s*<span[^>]*aria-hidden="true"/.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('puts no aria-label on decoration inside a label or a legend', () => {
    // The rule the marker broke, stated over the whole subtree rather than over
    // the one attribute value it arrived under. A label and a legend are read
    // in full to name what they point at, so an aria-label on a plain element
    // under one rewrites that element's share of the name and lands in the
    // control's. On a labelable element it is not a fragment, it is that
    // control's whole name, which is how Toggle names its switch from inside
    // the label that wraps it.
    const LABELABLE = ['button', 'input', 'meter', 'output', 'progress', 'select', 'textarea'];
    const block = /<(label|legend)\b[^>]*>([\s\S]*?)<\/\1>/g;
    const offenders = files
      .filter((f) => {
        block.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = block.exec(f.src)) !== null) {
          const inner = m[2];
          for (
            let i = inner.indexOf('aria-label');
            i !== -1;
            i = inner.indexOf('aria-label', i + 1)
          ) {
            const open = inner.lastIndexOf('<', i);
            const tag = /^<([a-zA-Z][\w-]*)/.exec(inner.slice(open))?.[1] ?? '';
            if (!LABELABLE.includes(tag)) return true;
          }
        }
        return false;
      })
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('states the requirement on the control of every component that draws a marker', () => {
    // The marker is decorative, so a component that draws one and stops has
    // told a screen reader nothing at all. A native input, select or textarea
    // takes `required`. A control whose role supports it takes aria-required. A
    // group takes it into its own name, because a group is named by its legend
    // and "Permissions (required)" describes the set rather than putting a word
    // into what a voice user speaks at a control. DateTimePicker owns no
    // control and forwards `required` to the two halves, which is the same
    // attribute reaching the same place.
    const native = /^\s*\{required\}\s*$/m;
    const offenders = files
      .filter((f) => REQUIRED_MARKER.test(f.src))
      .filter((f) => !NO_CONTROL_OF_THEIR_OWN.includes(f.name))
      .filter((f) => {
        const c = code(f.src);
        return !native.test(c) && !c.includes('aria-required=') && !c.includes('(required)');
      })
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('puts no aria-required on a role that does not support it', () => {
    // ARIA 1.2 lists aria-required for the roles that hold a value a form can
    // reject. button is not one, and neither is group, which is the implicit
    // role of a fieldset. A user agent drops the property there, so the picker
    // and the checkbox group announced no requirement at all while their source
    // read as though they did, both of them behind a scoped svelte-ignore of
    // the rule that was right. combobox, radiogroup, spinbutton and the native
    // controls carry it properly.
    const offenders = files
      .filter((f) => ariaRequiredRoles(code(f.src)).some((r) => r === 'button' || r === 'group'))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('finds a bad aria-required through the role, not through the tag name', () => {
    // The guard above is a filter over the library, so it passes on an empty
    // library and on a scanner that reads nothing. This is the shape it has to
    // catch, including the two attribute forms the kit writes and a tag whose
    // handler holds the `>` of an arrow function.
    const fixture = [
      `<button aria-required={required ? 'true' : undefined} onclick={() => go()}>x</button>`,
      `<fieldset {disabled} aria-required="true"></fieldset>`,
      `<button role="combobox" aria-expanded={open} aria-required="true">y</button>`,
      `<input type="text" role="spinbutton" aria-required="true" />`,
    ].join('\n');
    expect(ariaRequiredRoles(fixture)).toEqual(['button', 'group', 'combobox', 'spinbutton']);
  });

  it('excuses an outline-none only by its own ring or the wrapper drawing one for it', () => {
    // The field rule above is a filter, so it passes on a scanner that reads
    // nothing. One wrapper ring per file used to excuse every outline-none in
    // that file, so each bare element below passed.
    const fixture = [
      `<div class="has-[input:focus]:border-brand has-[input:focus-visible]:ring-2">`,
      `  <input class="outline-none" />`,
      `  <div role="combobox" class="outline-none"></div>`,
      `</div>`,
      `<button class={open ? 'outline-none' : ''}>x</button>`,
      `<div class="has-[[role=combobox]:focus-visible]:ring-2">`,
      `  <div role="combobox" class="outline-none"></div>`,
      `</div>`,
      `<textarea class="outline-none"></textarea>`,
      `<input class="outline-none focus-visible:ring-2" />`,
    ].join('\n');
    expect(outlinesWithoutRing(fixture)).toEqual([
      'outline-none',
      "open ? 'outline-none' : ''",
      'outline-none',
    ]);
    expect(markupElements(fixture).filter((e) => e.parent === undefined)).toHaveLength(5);
  });

  it('reads every lucide import and a class written as an expression', () => {
    // The icon rule read the first import only and a quoted class only, so
    // both icons sized here passed it.
    const fixture = [
      `<script lang="ts">`,
      `  import { X } from '@lucide/svelte';`,
      `  import { Eye, EyeOff as Hidden, type IconProps } from '@lucide/svelte';`,
      `  import Check from '@lucide/svelte/icons/check';`,
      `</script>`,
      `<X size={16} />`,
      `<Eye class={open ? 'h-4 w-4' : 'h-5 w-5'} />`,
      `<Hidden class="shrink-0 size-4" />`,
      `<Check size={14} class="text-success" />`,
    ].join('\n');
    expect(iconsSizedByClass(fixture)).toEqual(['Eye', 'Hidden']);
  });

  it('refuses a lucide size off the ladder, and an icon with no size at all', () => {
    // The class rule passes every one of these, because none is sized by a
    // class. A size the component computes is read where it is computed.
    const fixture = [
      `<script lang="ts">`,
      `  import { Eye, PanelLeft, X, Check } from '@lucide/svelte';`,
      `  import Copy from '@lucide/svelte/icons/copy';`,
      `</script>`,
      `<Eye size={15} aria-hidden="true" />`,
      `<PanelLeft size="18" />`,
      `<X />`,
      `<Check size={14} />`,
      `<Copy {size} />`,
    ].join('\n');
    expect(iconsSizedByClass(fixture)).toEqual([]);
    expect(iconsOffLadder(fixture)).toEqual(['Eye 15', 'PanelLeft 18', 'X 24']);
  });

  it('asks for the exit on the surface that leaves, not anywhere in the file', () => {
    // A preset on a child, or on a panel the component also opens, used to
    // pass the dismiss rule for a surface that vanished in one frame.
    const leaves = `{#if visible}<div transition:motion.toast|global role="status"><p>Saved</p></div>{/if}`;
    const snaps = [
      `{#if visible}`,
      `  <div role="status">`,
      `    <span transition:motion.toast|global>Saved</span>`,
      `  </div>`,
      `{/if}`,
    ].join('\n');
    expect(surfacesWithoutExit(leaves)).toEqual([]);
    expect(surfacesWithoutExit(snaps)).toEqual(['<div role="status">']);
  });

  it.each(NO_CONTROL_OF_THEIR_OWN)(
    '%s tells the caller the marker is decorative and the attribute is theirs to set',
    (name) => {
      const src = files.find((f) => f.name === name)!.src;
      expect(src, `${name} draws a marker and explains nothing`).toContain('decorative');
    },
  );

  it('still finds every component that draws a marker', () => {
    // The three guards above are filters. A marker rewritten into a shape the
    // pattern misses would empty every one of them and they would all pass.
    expect(files.filter((f) => REQUIRED_MARKER.test(f.src)).length).toBeGreaterThanOrEqual(16);
  });

  it('states no duration or curve the theme does not name', () => {
    // The theme sets the fast rung and the move curve as the defaults every
    // `transition-*` utility reads, so `transition-colors` alone is complete
    // and the other rungs are `duration-base`, `duration-slow` and
    // `duration-progress`. A number is a fifth speed nobody chose, and
    // Tailwind's `ease-out` is a curve the theme never states. `transition-all`
    // animates whatever happens to change, layout included, which is how a
    // panel's width once eased while its text reflowed on every frame.
    const LITERAL =
      /\b(?:duration-\d+|duration-\[[^\]]*\]|ease-(?:in|out|in-out|linear)|transition-all)\b/;
    const offenders = files
      .filter((f) => LITERAL.test(f.src))
      .map((f) => `${f.name}: ${LITERAL.exec(f.src)![0]}`);
    expect(offenders).toEqual([]);
  });

  it('enters and leaves through the motion presets and nothing else', () => {
    // svelte/transition and svelte/easing each carry their own numbers. One
    // fly({ y: 8, duration: 150 }) in a component is a fifth vocabulary, and
    // a setTimeout that waits for an animation is a duration written twice,
    // which is how the dialog stack held its own 200ms for a year.
    const offenders = files
      .filter(
        (f) =>
          /from 'svelte\/(?:transition|easing|animate)'/.test(f.src) ||
          /setTimeout\([^)]*\b(?:1[2-9]\d|[2-9]\d\d)\b/.test(f.src) ||
          /\s(?:transition|in|out|animate):(?!motion\.)[A-Za-z_$]/.test(f.src),
      )
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('mounts every modal surface and every scrim through a preset', () => {
    // The AppShell phone nav drawer and its scrim snapped open and shut
    // while every other drawer slid. Each opening tag that claims
    // aria-modal, or dims the page, has to carry its preset itself.
    const tags = (src: string, marker: RegExp) => openingTags(src).filter((t) => marker.test(t));
    const offenders = files.flatMap((f) => {
      const src = code(f.src);
      const modal = tags(src, /aria-modal="true"/).filter(
        (t) => !/transition:motion\.(?:dialog|drawer)\|global/.test(t),
      );
      const scrim = tags(src, /\bbg-black\//).filter(
        (t) => !t.includes('transition:motion.scrim|global'),
      );
      return [...modal, ...scrim].map((t) => `${f.name}: ${t.slice(0, 60).replace(/\s+/g, ' ')}`);
    });
    expect(offenders).toEqual([]);
  });

  it('leaves through a preset wherever a surface dismisses itself', () => {
    // Alert left on the toast preset while Banner, dismissed by hand or by
    // its own timer, vanished in one frame. A component that offers
    // ondismiss takes itself off the screen and owes that exit. The preset
    // has to sit on the surface that leaves: one anywhere else in the file,
    // on a panel or a child, plays nothing when the component goes.
    const offenders = files
      .filter((f) => /\bondismiss\??:/.test(f.src))
      .flatMap((f) => surfacesWithoutExit(f.src).map((t) => `${f.name}: ${t}`));
    expect(offenders).toEqual([]);
  });

  it('plays every exit even when a parent removes the component', () => {
    // A Svelte transition is local by default: it plays only when its own
    // block toggles. Every console wraps a Modal in a page-level {#if} so the
    // form inside starts fresh each time, and on that page a local exit never
    // ran, because the parent unmounted the whole component before the
    // dialog's own block could close. |global plays the exit on any ancestor
    // change, which is the only way the kit can promise one.
    const offenders = files
      .filter((f) => /transition:motion\.[a-z]+(?!\|global)\b/.test(f.src))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });
});

describe('tone vocabulary', () => {
  const ACCENT = ['neutral', 'brand', 'success', 'warn', 'danger', 'violet'];
  const STATUS = ['neutral', 'brand', 'success', 'warn', 'danger'];

  it.each(['Badge', 'Tag', 'Indicator', 'Progress'])('%s covers every accent tone', (name) => {
    const src = files.find((f) => f.name === name)!.src;
    for (const tone of ACCENT) {
      expect(src, `${name} has no ${tone} tone`).toMatch(new RegExp(`\\b${tone}:`));
    }
  });

  it.each(['Alert', 'Banner', 'Toaster'])('%s covers every status tone', (name) => {
    const src = files.find((f) => f.name === name)!.src;
    for (const tone of STATUS) {
      expect(src, `${name} has no ${tone} tone`).toMatch(new RegExp(`\\b${tone}:`));
    }
  });

  it('no component still spells the brand tone "info" in its own tone map', () => {
    const offenders = files.filter((f) => /^\s+info:/m.test(f.src)).map((f) => f.name);
    expect(offenders).toEqual([]);
  });
});

describe('the kit carries its own styles', () => {
  const theme = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');

  it('tells Tailwind to scan the built components', () => {
    // Without this the kit publishes tokens and no utility classes, and each
    // component renders only the parts its host app happens to use elsewhere.
    expect(theme).toMatch(/@source\s+['"]\.\.\/\.\.\/\.\.\/dist['"]/);
  });

  it('honors a reader who asked for less motion', () => {
    // Every animation in the kit ran regardless: the drawer slid, the toast flew
    // in, the ping looped forever. Handled once here so it covers components
    // added later too.
    expect(theme).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('states the control height as a token', () => {
    expect(theme).toContain('--spacing-control:');
  });

  it('never builds a utility class out of a runtime value', () => {
    // Tailwind matches complete class names in source text. A class assembled
    // from a variable matches no candidate, so no rule is generated and the
    // class silently does nothing. Dialog shipped `z-[{zIndex}]` and every
    // stacked dialog rendered at `z-index: auto`. Its own test asserted the
    // class string was present, which it was, and passed the whole time.
    // Runtime values belong in a `style` attribute.
    const dynamic =
      /\b(?:z|w|h|min-w|min-h|max-w|max-h|top|left|right|bottom|gap|p|m|px|py|mx|my|text|bg|border|rounded|opacity|translate-x|translate-y|grid-cols)-\[[^\]]*\{/;
    const offenders = files.filter((f) => dynamic.test(f.src)).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('gives every aria-modal surface the focus behavior it advertises', () => {
    // `aria-modal="true"` tells a screen reader the rest of the page is gone.
    // Modal and Drawer both said it while leaving focus in the document behind
    // them, so the user was told a dialog had opened and then carried on
    // reading the page underneath. The behavior lives in internal/overlay.ts.
    // A component that claims the role has to use it.
    const offenders = files
      .filter((f) => f.src.includes('aria-modal'))
      .filter((f) => !f.src.includes('use:overlay') && !f.src.includes('overlay.js'))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('names every aria-modal surface', () => {
    // A dialog with no accessible name is announced as just "dialog".
    const offenders = files
      .filter((f) => f.src.includes('aria-modal'))
      .filter((f) => !f.src.includes('aria-labelledby') && !f.src.includes('aria-label'))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });
});

describe('one stacking order', () => {
  const theme = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');
  const LAYERS = ['dropdown', 'overlay', 'drawer', 'modal', 'tooltip', 'toast', 'skip-link'];

  /** Sources that can carry a class, components and the shared class strings. */
  const sources = [
    ...files.map((f) => ({ name: f.name, src: f.src })),
    ...['panel', 'layout', 'field'].map((n) => ({
      name: `internal/${n}`,
      src: readFileSync(join(__dirname, 'internal', `${n}.ts`), 'utf8'),
    })),
  ];

  it('leaves no component holding a bare z-index number', () => {
    // Seven components carried z-50 and one carried z-[60]. Everything at one
    // number stacks by document order, so a Dropdown opened after a Modal
    // painted over it and the same pair the other way round did not. The layer
    // is a property of the surface, so it is asked for by name.
    const offenders = sources.filter((f) => /\bz-(?:\[|\d)/.test(code(f.src))).map((f) => f.name);
    expect(offenders, 'name the layer instead: z-modal, z-drawer, z-dropdown').toEqual([]);
  });

  it('asks only for layers the theme declares', () => {
    // A z-* class naming a token that does not exist compiles to nothing at
    // all, which is the same undefined stacking order arrived at by a different
    // route and with no z-index in the file to find it by.
    // Anchored so it reads class names and not CSS. `z-index` inside Dialog's
    // inline style is the property, and `--z-index-modal` inside it is the
    // token that style resolves against. A bare word scan counted both as a
    // layer called `index` that the theme does not declare.
    const used = new Set<string>();
    for (const f of sources) {
      for (const [, name] of code(f.src).matchAll(/(?<![-\w])z-([a-z][a-z-]*)(?![-\w:])/g)) {
        used.add(name);
      }
    }
    const undeclared = [...used].filter((name) => !theme.includes(`--z-index-${name}:`));
    expect(undeclared).toEqual([]);
  });

  it('puts every declared layer to work', () => {
    // The other direction. A layer nothing asks for is a token nobody reads,
    // which is the defect this scale replaced.
    const all = sources.map((f) => code(f.src)).join('\n');
    const unused = LAYERS.filter((name) => !new RegExp(`\\bz-${name}\\b`).test(all));
    expect(unused).toEqual([]);
  });
});

describe('the shell prints', () => {
  const theme = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');

  /**
   * Where the print rules start, found at the start of a line.
   *
   * The comment introducing them names `@media print` too, so a plain indexOf
   * lands in the prose and every assertion below it reads the comment as part
   * of the block it describes.
   */
  const printAt = theme.search(/^@media print/m);
  const printBlock = theme.slice(printAt);

  /** Every value the components hand to `data-print`. */
  function markers(): Set<string> {
    const found = new Set<string>();
    for (const f of files) {
      for (const [, value] of f.src.matchAll(/data-print="([a-z]+)"/g)) found.add(value);
    }
    return found;
  }

  it('declares a print stylesheet at all', () => {
    // There was no `@media print` rule anywhere in the consuming applications, and three
    // surfaces print: an invoice, an audit log and a subject-access export.
    expect(printAt).toBeGreaterThan(-1);
  });

  it('keeps the print rules out of a cascade layer', () => {
    // An unlayered declaration beats every layered one whatever its
    // specificity. Inside `@layer base` a `bg-surface` utility on a card would
    // put the dark surface straight back on the paper.
    expect(printAt).toBeGreaterThan(theme.indexOf('@layer base'));
    // Everything after the base layer closes is unlayered, and the base layer
    // is the last layer the file opens.
    expect(printBlock.includes('@layer')).toBe(false);
  });

  it('repaints the palette rather than every component', () => {
    // Each component paints from these tokens, so redefining them is the whole
    // library turned monochrome without one component knowing about paper.
    for (const token of ['--color-ink', '--color-surface', '--color-fg', '--color-muted']) {
      expect(printBlock, `${token} keeps its screen value on paper`).toContain(token);
    }
  });

  it('gives a rule to every marker a component sets', () => {
    // A marker with no rule behind it is an attribute that does nothing, and
    // nothing about the printed page says which of the two it was.
    const orphans = [...markers()].filter((v) => !printBlock.includes(`[data-print='${v}']`));
    expect(orphans).toEqual([]);
  });

  it('hides the chrome a reader cannot navigate on paper', () => {
    for (const name of ['AppShell', 'ThemeToggle', 'Toaster', 'Drawer']) {
      const f = files.find((x) => x.name === name)!;
      expect(f.src, `${name} prints itself onto every page`).toContain('data-print="hide"');
    }
  });

  it('releases the boxes that clip, so the content past the first page prints', () => {
    // The shell is `h-screen` with the content column set to `overflow-auto`,
    // and the table scrolls sideways inside its own box. Paper has no viewport:
    // every one of those prints one screenful and drops the rest.
    for (const name of ['AppShell', 'Table']) {
      const f = files.find((x) => x.name === name)!;
      expect(f.src, `${name} clips its own content on paper`).toContain('data-print="unclip"');
    }
    expect(printBlock).toMatch(/\[data-print='unclip'\][\s\S]{0,200}height:\s*auto/);
  });

  it('holds a card and a row together across a page break', () => {
    expect(printBlock).toContain('break-inside: avoid');
    expect(printBlock).toMatch(/thead\s*\{[^}]*table-header-group/);
    for (const name of ['Card', 'Panel']) {
      expect(files.find((x) => x.name === name)!.src).toContain('data-print="keep"');
    }
  });

  it('prints the target of a link a reader cannot follow, and only that one', () => {
    // An invoice carrying "(/portal/invoices/8841)" after every internal link
    // is noise to a reader who is already inside that application.
    expect(printBlock).toMatch(/a\[href\^='http'\]/);
    expect(printBlock).toContain('attr(href)');
  });
});

describe('a field says that it is one', () => {
  /**
   * The marker is what lets a surface size itself to the form it is holding,
   * and it is invisible: a component that forgets it is not broken, it is one
   * field lighter than it says, and the panel it sits in opens too narrow with
   * nothing on screen to explain why.
   */
  /**
   * A control the reader can operate, which is what separates a field from a
   * label-shaped thing such as Stat or Table's region name.
   */
  const CONTROL = /<input|<select|<textarea|role="switch"|role="combobox"|contenteditable/;

  /**
   * Four shapes, because a field takes four. Most wrap themselves in
   * FIELD_WRAP. A choice group is a fieldset, and a control that is its own
   * label wraps nothing, which is how Toggle went unchecked. Naming the last
   * shape by hand would leave the next one unchecked too, so the filter asks
   * what the file does: it takes a label and it renders something operable.
   * A row that renders the kit's error line under itself, as FilterChips
   * does, reports a field's error and is one.
   */
  const wrappers = files.filter((f) => {
    const src = code(f.src);
    return (
      /FIELD_WRAP/.test(src) ||
      /role="radiogroup"|CHOICE_GROUP/.test(src) ||
      /FIELD_ERROR/.test(src) ||
      (/label\?:/.test(src) && CONTROL.test(src))
    );
  });

  it('finds the labeled controls to check', () => {
    // A filter that matches nothing passes every assertion under it.
    expect(wrappers.length).toBeGreaterThan(15);
  });

  it.each(wrappers.map((f) => f.name))('%s marks its outermost element', (name) => {
    const src = code(files.find((f) => f.name === name)!.src);
    expect(src).toMatch(/<(?:div|fieldset|label)\s+data-field\b/);
  });

  it('puts the marker on nothing that is not a field', () => {
    const stray = files
      .filter((f) => !wrappers.includes(f))
      .filter((f) => /\sdata-field\b/.test(code(f.src)))
      .map((f) => f.name);
    expect(stray, 'data-field is counted as one form field wherever it appears').toEqual([]);
  });
});
