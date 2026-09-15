/**
 * Every interactive primitive meets a finger at 44px and a mouse at the size
 * it always had.
 *
 * Measured over 48 admin routes at 400px: 2,007 of 2,097 visible controls
 * under 44px, 96% of them the kit's, and 56 under the 24px floor, every one
 * of them the kit's. The fix keys on `pointer: coarse`, so it is a media
 * query and not a runtime branch: the classes below compile inside that
 * query and are inert under a mouse. The mock is the query these classes are
 * read under; what a test can check is that each control carries them and
 * that nothing it carries changes with the pointer.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Alert from './components/Alert.svelte';
import Badge from './components/Badge.svelte';
import Breadcrumb from './components/Breadcrumb.svelte';
import Button from './components/Button.svelte';
import Checkbox from './components/Checkbox.svelte';
import Collapsible from './components/Collapsible.svelte';
import CopyButton from './components/CopyButton.svelte';
import Modal from './components/Modal.svelte';
import PageShell from './components/PageShell.svelte';
import Pagination from './components/Pagination.svelte';
import Radio from './components/Radio.svelte';
import SidebarNav from './components/SidebarNav.svelte';
import Tabs from './components/Tabs.svelte';
import Tag from './components/Tag.svelte';
import ThemeToggle from './components/ThemeToggle.svelte';
import Toggle from './components/Toggle.svelte';
import { HIT_AREA, HIT_AREA_POSITIONED, TOUCH_GROW } from './internal/touch.js';

const theme = readFileSync(join(__dirname, 'styles/theme.css'), 'utf8');
const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/** The query the classes compile under, answered as a phone or as a mouse answers it. */
function pointer(coarse: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(pointer: coarse)' ? coarse : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

const classes = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

/** The hit box that does not move the visual. */
function expectHitArea(el: Element | null, positioned = 'relative') {
  const list = classes(el);
  for (const c of HIT_AREA_POSITIONED.split(' '))
    expect(list, `${c} on ${el?.tagName}`).toContain(c);
  expect(list, `hit-area needs a positioned element`).toContain(positioned);
}

/** The control that grows to the control height, which is 44px under a finger. */
function expectGrows(el: Element | null) {
  const list = classes(el);
  for (const c of TOUCH_GROW.split(' ')) expect(list, `${c} on ${el?.tagName}`).toContain(c);
}

beforeEach(() => pointer(true));
afterEach(() => vi.unstubAllGlobals());

describe('the theme declares the mechanism', () => {
  it('names the query once, as a variant', () => {
    expect(theme).toContain('@custom-variant coarse (@media (pointer: coarse));');
  });

  it('raises the control height to 44px under a coarse pointer and nowhere else', () => {
    const block = /@media \(pointer: coarse\) \{\s*:root \{\s*--spacing-control: 2\.75rem;/;
    expect(theme).toMatch(block);
    // The desktop value is the one the components were drawn at.
    expect(theme).toMatch(/^\s*--spacing-control: 2\.375rem;/m);
  });

  it('draws the hit box from the control token, centred, and only under a finger', () => {
    const utility = theme.slice(theme.indexOf('@utility hit-area'));
    const body = utility.slice(0, utility.indexOf('\n}') + 2);
    expect(body).toContain('@media (pointer: coarse)');
    expect(body).toContain('min-width: var(--spacing-control)');
    expect(body).toContain('min-height: var(--spacing-control)');
    expect(body).toContain('translate: -50% -50%');
    // It does not position the element: that would fight the `absolute` a
    // clear button inside an input relies on.
    expect(body).not.toMatch(/^\s*position: relative/m);
  });
});

describe('the small controls keep their visual and grow their hit box', () => {
  it('Toggle', () => {
    const { getByRole } = render(Toggle, { props: { label: 'Notify' } });
    expectHitArea(getByRole('switch'));
  });

  it('Checkbox, on the label a click anywhere in reaches the input', () => {
    const { container } = render(Checkbox, { props: { label: 'Agree' } });
    expectHitArea(container.querySelector('label'));
  });

  it('Radio', () => {
    const { container } = render(Radio, { props: { value: 'a', label: 'A' } });
    expectHitArea(container.querySelector('label'));
  });

  it('Breadcrumb links, which were 16px tall', () => {
    const { container } = render(Breadcrumb, {
      props: {
        items: [
          { label: 'Settings', href: '/settings' },
          { label: 'Billing', href: '/settings/billing' },
          { label: 'Invoices' },
        ],
      },
    });
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2);
    for (const a of links) expectHitArea(a);
  });

  it('the back link, which was 20px tall', () => {
    const { container } = render(PageShell, {
      props: { title: 'Flow', back: { href: '/flows', label: 'Flows' }, children: text('x') },
    });
    expectHitArea(container.querySelector('[data-testid="page-back"]'));
  });

  it('Pagination steps and pages, which were 28px', () => {
    const { container } = render(Pagination, {
      props: { page: 2, total: 200, perPage: 20, onchange: () => {} },
    });
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(2);
    for (const b of buttons) expectHitArea(b);
  });

  it('CopyButton', () => {
    const { getByRole } = render(CopyButton, { props: { value: 'x' } });
    expectHitArea(getByRole('button'));
  });

  it("a Tag's remove cross", () => {
    const { getByLabelText } = render(Tag, {
      props: { label: 'beta', removable: true, onremove: () => {} },
    });
    expectHitArea(getByLabelText('Remove beta'));
  });

  it("an Alert's dismiss cross", () => {
    const { getByLabelText } = render(Alert, {
      props: { children: text('x'), dismissible: true, ondismiss: () => {} },
    });
    expectHitArea(getByLabelText('Dismiss'));
  });

  it("a Modal's close cross", () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'T', children: text('x') },
    });
    const close = [...container.querySelectorAll('[aria-label="Close"]')].find(
      (el) => el.tagName === 'BUTTON' && el.getAttribute('aria-hidden') !== 'true',
    );
    expectHitArea(close ?? null);
  });
});

describe('the controls that may grow take the control height', () => {
  it('Button, at every size', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { container } = render(Button, { props: { size, children: text('Go') } });
      expectGrows(container.querySelector('button'));
    }
  });

  it('an icon-only Button, which grows in both directions', () => {
    const { container } = render(Button, {
      props: { size: 'sm', 'aria-label': 'Delete', hint: false, children: text('x') },
    });
    expectGrows(container.querySelector('button'));
  });

  it('Tabs', () => {
    const { getAllByRole } = render(Tabs, {
      props: { items: [{ id: 'a', label: 'A' }], active: 'a', onchange: () => {} },
    });
    expectGrows(getAllByRole('tab')[0]);
  });

  it('ThemeToggle, which was 32px', () => {
    const { getByRole } = render(ThemeToggle);
    expectGrows(getByRole('button'));
  });

  it('SidebarNav rows and disclosures, which were 34px and 32px', () => {
    const { container } = render(SidebarNav, {
      props: {
        activePath: '/a',
        items: [
          { id: 'a', label: 'A', href: '/a' },
          {
            id: 'b',
            label: 'B',
            href: '/b',
            children: [{ id: 'c', label: 'C', href: '/b/c' }],
          },
        ],
      },
    });
    for (const el of container.querySelectorAll('a, button')) expectGrows(el);
  });

  it('a Collapsible trigger', () => {
    const { getByRole } = render(Collapsible, { props: { label: 'More', children: text('x') } });
    expectGrows(getByRole('button'));
  });
});

describe('nothing changes with the pointer', () => {
  it('renders the same classes under a mouse, because the query is in the stylesheet', () => {
    const first = render(Toggle, { props: { label: 'x' } });
    const coarse = first.getByRole('switch').className;
    first.unmount();
    vi.unstubAllGlobals();
    pointer(false);
    const fine = render(Toggle, { props: { label: 'x' } }).getByRole('switch').className;
    expect(fine).toBe(coarse);
  });

  it('keeps the Badge, which is not a control, out of it', () => {
    const { container } = render(Badge, { props: { children: text('draft') } });
    expect(classes(container.firstElementChild)).not.toContain('hit-area');
  });
});

describe('every hit box sits on a positioned element', () => {
  // A pseudo-element centres on its nearest positioned ancestor. On a static
  // element that is whatever the page happens to have positioned, and the
  // box lands somewhere else entirely.
  const dir = join(__dirname, 'components');
  const sources = readdirSync(dir)
    .filter((f) => f.endsWith('.svelte'))
    .map((f) => ({ name: f, src: readFileSync(join(dir, f), 'utf8') }));

  it('reads the constants, never the class by hand', () => {
    const handRolled = sources
      .filter((f) => /[^:_-]hit-area\b/.test(f.src.replace(/HIT_AREA(_POSITIONED)?/g, '')))
      .map((f) => f.name);
    // Table addresses the caller's own sort button through an arbitrary
    // variant, `[&_thead_th_button]:hit-area`, which a constant cannot spell;
    // the variant prefix is what the pattern leaves out.
    expect(handRolled).toEqual([]);
  });

  it('pairs HIT_AREA_POSITIONED with an absolute element', () => {
    for (const f of sources.filter((x) => x.src.includes('HIT_AREA_POSITIONED}'))) {
      const uses = [...f.src.matchAll(/\{HIT_AREA_POSITIONED\}[^"]*"/g)].map((m) => m[0]);
      expect(uses.length, f.name).toBeGreaterThan(0);
      for (const u of uses) expect(u, f.name).toMatch(/\babsolute\b/);
    }
  });

  it('carries relative inside HIT_AREA itself', () => {
    expect(HIT_AREA.split(' ')).toContain('relative');
  });
});
