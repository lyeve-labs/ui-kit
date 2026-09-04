import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The library drifted because nothing measured it. Every component was correct
 * on its own terms and wrong beside its neighbour: three focus treatments, two
 * wrapper gaps, two error-border opacities, two control heights, and icons
 * drawn as Unicode characters in some components and stroked SVG in others.
 *
 * These tests read the source rather than the rendered output, because the
 * defect is not what any single component does - it is the disagreement between
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

/** The asterisk a component draws beside a label when the field is required. */
const REQUIRED_MARKER = /\{#if required\}\s*<span/;

/**
 * The two components that draw the marker for a control they do not own. Field
 * hands its wiring to a snippet the caller fills; Label sits beside whatever the
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
    // Six components repeated these literals. They agreed today; nothing made
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
    // a stray coloured line under the open header - three edges clipped, one
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
    // being skipped, so a field labelled Email announced as "Email required".
    // A name is what a voice-control user speaks at the control, and nobody
    // says "Email required". The marker is paint; the state belongs on the
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
    // takes `required`; a control whose role supports it takes aria-required; a
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

  it('names one duration for every colour transition', () => {
    // A bare `transition-colors` inherits Tailwind's default and reads the same,
    // but it means the value is not stated anywhere a designer can change it.
    const offenders = files
      .filter((f) =>
        /transition-colors(?!\s+(?:duration-|\[&[^\]]*\]:duration-))/.test(
          f.src.replace(/\s+/g, ' '),
        ),
      )
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

  it('honours a reader who asked for less motion', () => {
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
    // stacked dialog rendered at `z-index: auto`; its own test asserted the
    // class string was present, which it was, and passed the whole time.
    // Runtime values belong in a `style` attribute.
    const dynamic =
      /\b(?:z|w|h|min-w|min-h|max-w|max-h|top|left|right|bottom|gap|p|m|px|py|mx|my|text|bg|border|rounded|opacity|translate-x|translate-y|grid-cols)-\[[^\]]*\{/;
    const offenders = files.filter((f) => dynamic.test(f.src)).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('gives every aria-modal surface the focus behaviour it advertises', () => {
    // `aria-modal="true"` tells a screen reader the rest of the page is gone.
    // Modal and Drawer both said it while leaving focus in the document behind
    // them, so the user was told a dialog had opened and then carried on
    // reading the page underneath. The behaviour lives in internal/overlay.ts;
    // a component that claims the role has to use it.
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
