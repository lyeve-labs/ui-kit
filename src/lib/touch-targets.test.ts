/**
 * Every interactive primitive meets a finger at 44px and a mouse at the size
 * it always had.
 *
 * Measured over 48 admin routes at 400px: 2,007 of 2,097 visible controls
 * under 44px, 96% of them the kit's, and 56 under the 24px floor, every one
 * of them the kit's. The fix keys on `pointer: coarse`, so it is a media
 * query and not a runtime branch: the classes below compile inside that
 * query and are inert under a mouse. The mock is the query these classes are
 * read under. What a test can check is that each control carries them and
 * that nothing it carries changes with the pointer.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Alert from './components/Alert.svelte';
import AuthShell from './components/AuthShell.svelte';
import Autocomplete from './components/Autocomplete.svelte';
import Badge from './components/Badge.svelte';
import Breadcrumb from './components/Breadcrumb.svelte';
import Button from './components/Button.svelte';
import Checkbox from './components/Checkbox.svelte';
import CheckboxGroup from './components/CheckboxGroup.svelte';
import Collapsible from './components/Collapsible.svelte';
import DatePicker from './components/DatePicker.svelte';
import FilterChips from './components/FilterChips.svelte';
import CopyButton from './components/CopyButton.svelte';
import CopyField from './components/CopyField.svelte';
import Modal from './components/Modal.svelte';
import MultiSelect from './components/MultiSelect.svelte';
import NumberInput from './components/NumberInput.svelte';
import PageShell from './components/PageShell.svelte';
import Pagination from './components/Pagination.svelte';
import Radio from './components/Radio.svelte';
import RadioGroup from './components/RadioGroup.svelte';
import SegmentedControl from './components/SegmentedControl.svelte';
import Select from './components/Select.svelte';
import SidebarNav from './components/SidebarNav.svelte';
import SortableList from './components/SortableList.svelte';
import Tabs from './components/Tabs.svelte';
import Tag from './components/Tag.svelte';
import ThemeToggle from './components/ThemeToggle.svelte';
import TimePicker from './components/TimePicker.svelte';
import Toggle from './components/Toggle.svelte';
import TreeView from './components/TreeView.svelte';
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

  it('draws the hit box from the control token, centered, and only under a finger', () => {
    const utility = theme.slice(theme.indexOf('@utility hit-area'));
    const body = utility.slice(0, utility.indexOf('\n}') + 2);
    expect(body).toContain('@media (pointer: coarse)');
    // A row of targets narrower than the control size may hand its own width
    // in, so neighbors' boxes meet rather than overlap.
    expect(body).toContain('min-width: var(--hit-width, var(--spacing-control))');
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

  it('SegmentedControl segments, which were 26px small and 38px at the default size', () => {
    // A segment that grew would stand the track proud of the Input beside it,
    // so it keeps its visual inside the track and grows its hit box.
    const radios = [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
    ];
    const links = radios.map((o) => ({ ...o, href: `?range=${o.value}` }));
    for (const size of ['sm', 'md'] as const) {
      for (const options of [radios, links]) {
        const { container, unmount } = render(SegmentedControl, {
          props: { label: 'Range', options, value: 'day', size },
        });
        const segments = container.querySelectorAll('[data-segment]');
        expect(segments).toHaveLength(2);
        for (const segment of segments) expectHitArea(segment);
        unmount();
      }
    }
  });

  it('the SegmentedControl track frames itself without a border under a finger', () => {
    // A caller that lets a long row scroll clips the segments at the track's
    // padding box. A 1px border kept that box at 42px inside a 44px track, so
    // each segment's hit box lost a pixel at the top and the bottom. An inset
    // outline draws the same frame, leaves the padding box at the outer edge,
    // and survives forced colors, which drop a shadow.
    const options = [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
    ];
    for (const error of [undefined, 'Pick one']) {
      const { getByRole, unmount } = render(SegmentedControl, {
        props: { label: 'Range', options, value: 'day', error },
      });
      const track = classes(getByRole('radiogroup'));
      for (const c of [
        'coarse:border-0',
        'coarse:p-0.75',
        'coarse:outline',
        'coarse:outline-1',
        'coarse:-outline-offset-1',
      ])
        expect(track, c).toContain(c);
      expect(track).toContain(error ? 'coarse:outline-danger' : 'coarse:outline-line-strong');
      expect(
        track.some((c) => c.startsWith('coarse:ring')),
        'no shadow frame',
      ).toBe(false);
      // The mouse keeps the border and the padding it was drawn with.
      expect(track).toContain('border');
      expect(track).toContain('p-0.5');
      unmount();
    }
  });

  it('SegmentedControl segments are never narrower than a finger, at either size', () => {
    // A short label such as "6h" drew a segment 35px wide, and its 44px hit
    // box overlapped both neighbors'. A segment as wide as the control size
    // keeps the boxes apart.
    const radios = [
      { value: '6h', label: '6h' },
      { value: '24h', label: '24h' },
    ];
    const links = radios.map((o) => ({ ...o, href: `?window=${o.value}` }));
    for (const size of ['sm', 'md'] as const) {
      for (const options of [radios, links]) {
        const { container, unmount } = render(SegmentedControl, {
          props: { label: 'Window', options, value: '6h', size },
        });
        for (const segment of container.querySelectorAll('[data-segment]'))
          expect(classes(segment)).toContain('coarse:min-w-control');
        unmount();
      }
    }
  });

  it('wrapped FilterChips rows, whose hit boxes covered the row above', () => {
    // A chip is 26px tall and its hit box 44px, so rows 18px apart meet
    // without overlapping. At the 6px gap a mouse keeps, the next row took
    // 12px off the bottom of every chip above it.
    const { getByRole } = render(FilterChips, {
      props: {
        label: 'Status',
        value: 'all',
        options: [
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Open' },
        ],
      },
    });
    const row = classes(getByRole('group'));
    expect(row).toContain('coarse:gap-y-4.5');
    expect(row).toContain('gap-1.5');
    for (const chip of getByRole('group').querySelectorAll('button')) expectHitArea(chip);
  });

  it('CheckboxGroup and RadioGroup rows, whose hit boxes covered the row below', () => {
    // An inline row is as tall as its label line and its hit box is 44px, so
    // rows 44px less that line apart meet without overlapping. At the 8px a
    // mouse keeps, the next row took the bottom third of every row above it.
    const LINE = { sm: 16, md: 20, lg: 24 } as const;
    const options = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];
    for (const kind of ['checkbox', 'radio'] as const) {
      for (const orientation of ['vertical', 'horizontal'] as const) {
        for (const size of ['sm', 'md', 'lg'] as const) {
          for (const variant of ['inline', 'card'] as const) {
            const props = { label: 'Pick', options, orientation, size, variant };
            const { container, unmount } =
              kind === 'checkbox'
                ? render(CheckboxGroup, { props })
                : render(RadioGroup, { props });
            const list = classes(container.querySelector('fieldset > div'));
            const coarse = list.find((c) => c.startsWith('coarse:gap-y-'));
            const where = `${orientation} ${size} ${variant}`;
            // The mouse keeps the gap it had.
            expect(list, where).toContain(orientation === 'vertical' ? 'gap-2' : 'gap-y-2');
            if (variant === 'card') {
              // A card is taller than the hit box and draws none.
              expect(coarse, where).toBeUndefined();
            } else {
              expect(coarse, where).toBeDefined();
              const gap = Number(coarse!.slice('coarse:gap-y-'.length)) * 4;
              expect(LINE[size] + gap, where).toBeGreaterThanOrEqual(44);
            }
            unmount();
          }
        }
      }
    }
  });

  it('DatePicker days, whose hit boxes overlapped about 10px each way', async () => {
    // A day is 32px with a 44px hit box. In the 272px panel the columns were
    // 36px apart and the rows 34px, so every box covered its neighbors'.
    // Under a finger seven columns 44px apart are 308px of grid. The panel
    // holds them inside its border and padding and is no wider than a 320px
    // phone, and the rows open a 12px gap.
    const { container } = render(DatePicker, { props: { label: 'Due', value: '2026-07-15' } });
    await fireEvent.click(container.querySelector('button')!);
    /** A spacing utility's value in px, from the class that starts with the prefix. */
    const px = (el: Element | null, prefix: string) => {
      const c = classes(el).find((x) => x.startsWith(prefix));
      expect(c, `${prefix} on ${el?.tagName}`).toBeDefined();
      return Number(c!.slice(prefix.length)) * 4;
    };
    const panel = container.querySelector('[role="dialog"]');
    const grid = container.querySelector('[data-day-grid]');
    // The mouse keeps the panel and the grid it had.
    expect(classes(panel)).toContain('w-68');
    expect(classes(grid)).toContain('gap-0.5');
    const outer = px(panel, 'coarse:w-');
    expect(outer, 'fits a 320px screen').toBeLessThanOrEqual(320);
    expect(classes(panel), 'a 1px border').toContain('border');
    const padding = px(grid?.parentElement ?? null, 'coarse:p-');
    const inner = outer - 2 * 1 - 2 * padding;
    const columnGap = px(grid, 'gap-');
    expect((inner + columnGap) / 7, 'column pitch').toBeGreaterThanOrEqual(44);
    expect(32 + px(grid, 'coarse:gap-y-'), 'row pitch').toBeGreaterThanOrEqual(44);
    const days = grid?.querySelectorAll('button') ?? [];
    expect(days.length).toBeGreaterThan(27);
    for (const day of days) expectHitArea(day);

    // In a Modal on a 320px phone the calendar shrinks to the body, about
    // 286px, and the columns close to 39px, so each 44px box overlapped its
    // neighbors by 5px. There the box takes the column's pitch and keeps its
    // height: the grid is a container and hands the box the smaller of the
    // control size and one pitch, its width and one gap over seven, so the
    // boxes meet at any width.
    expect(classes(grid)).toContain('@container');
    const gap = columnGap / 16;
    expect(classes(grid)).toContain(
      `coarse:[--hit-width:min(var(--spacing-control),calc((100cqw_+_${gap}rem)_/_7))]`,
    );
  });

  it('DatePicker month steps, whose hit boxes ran past the calendar', async () => {
    // A step is a 14px glyph in 6px of padding, 26px, so its 44px box reaches
    // 9px past it. It sits at the edge of the region inside 6px of padding,
    // so the box ran 3px past the edge and the calendar panned sideways under
    // a finger. The header insets itself by the rest, at the sides and the top.
    const { container, getByLabelText } = render(DatePicker, {
      props: { label: 'Due', value: '2026-07-15' },
    });
    await fireEvent.click(container.querySelector('button')!);
    const step = getByLabelText('Previous month');
    expectHitArea(step);
    expectHitArea(getByLabelText('Next month'));
    const px = (el: Element | null, prefix: string) => {
      const c = classes(el).find((x) => x.startsWith(prefix));
      return c === undefined ? 0 : Number(c.slice(prefix.length)) * 4;
    };
    const glyph = Number(step.querySelector('svg')?.getAttribute('width'));
    const overhang = (44 - (glyph + 2 * px(step, 'p-'))) / 2;
    const header = step.parentElement;
    const region = px(header?.parentElement ?? null, 'coarse:p-');
    expect(region + px(header, 'coarse:px-'), 'at the sides').toBeGreaterThanOrEqual(overhang);
    expect(region + px(header, 'coarse:pt-'), 'at the top').toBeGreaterThanOrEqual(overhang);
  });

  it('a DatePicker calendar never narrower than its day grid', async () => {
    // placePanel shrinks a panel to the room it opens in, with no floor, so in
    // a container narrower than about 250px the grid overflowed and the
    // calendar scrolled sideways inside itself. The panel holds seven 32px
    // days, six gaps, its padding and its 1px border, at either pointer.
    const { container } = render(DatePicker, { props: { label: 'Due', value: '2026-07-15' } });
    await fireEvent.click(container.querySelector('button')!);
    const panel = container.querySelector('[role="dialog"]');
    const grid = container.querySelector('[data-day-grid]');
    const px = (el: Element | null, prefix: string) => {
      const c = classes(el).find((x) => x.startsWith(prefix));
      expect(c, `${prefix} on ${el?.tagName}`).toBeDefined();
      return Number(c!.slice(prefix.length)) * 4;
    };
    const floor = (variant: string) => px(panel, `${variant}min-w-`);
    const days = 7 * 32 + 6 * px(grid, 'gap-');
    const padding = (prefix: string) => px(grid?.parentElement ?? null, prefix);
    expect(floor('')).toBe(days + 2 * padding('p-') + 2);
    expect(floor('coarse:')).toBe(days + 2 * padding('coarse:p-') + 2);
  });

  it('Pagination pages, spaced so their hit boxes do not overlap', () => {
    // A page is 28px wide and its hit box 44px, so pages 16px apart meet
    // without overlapping. At the 2px gap a mouse keeps, each page took 30px
    // of its own box.
    const { container } = render(Pagination, {
      props: { page: 2, total: 200, perPage: 20, onchange: () => {} },
    });
    const pageTwo = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === '2',
    );
    expectHitArea(pageTwo ?? null);
    const row = classes(pageTwo?.parentElement ?? null);
    expect(row).toContain('coarse:gap-4');
    expect(row).toContain('gap-0.5');
  });

  /** A spacing utility's value in px, from the class that starts with the prefix. */
  const spacing = (el: Element | null, prefix: string) => {
    const c = classes(el).find((x) => x.startsWith(prefix));
    expect(c, `${prefix} on ${el?.tagName}`).toBeDefined();
    return Number(c!.slice(prefix.length)) * 4;
  };

  it('MultiSelect chips, whose remove boxes covered the next chip and the row below', () => {
    // A chip is 20px tall and the center of its cross sits 14px from its end,
    // so the cross's 44px box reaches 12px above and below the chip and 8px
    // past its end. At the 6px gap a mouse keeps, the box took 18px of the row
    // below and 2px of the next chip, so a tap that meant to open the list
    // could remove a value.
    const { getByLabelText } = render(MultiSelect, {
      props: {
        label: 'Roles',
        options: [
          { value: 'a', label: 'Admin' },
          { value: 'b', label: 'Billing' },
        ],
        value: ['a', 'b'],
      },
    });
    const cross = getByLabelText('Remove Admin');
    expectHitArea(cross);
    const row = cross.closest('[role="presentation"]');
    expect(classes(row), 'the mouse keeps its gap').toContain('gap-1.5');
    expect(20 + spacing(row, 'coarse:gap-y-'), 'row pitch').toBeGreaterThanOrEqual(44);
    expect(spacing(row, 'coarse:gap-x-'), 'past the end').toBeGreaterThanOrEqual(22 - 14);
  });

  it("MultiSelect chips, whose remove boxes reached 5px past the field's border", () => {
    // The box reaches 12px above and below its 20px chip, and the frame put
    // the chips 7px inside its outer edge, its 1px border and 6px of padding.
    // The top row's boxes started 5px above the field and the bottom row's
    // ended 5px below it, where a tap meant for the label or the next field
    // removed a value. Under a finger the padding takes the 11px the box
    // needs, and one row of chips still fills the 44px control height.
    const { getByLabelText } = render(MultiSelect, {
      props: {
        label: 'Roles',
        options: [{ value: 'a', label: 'Admin' }],
        value: ['a'],
      },
    });
    const frame = getByLabelText('Remove Admin').closest('[role="presentation"]');
    expect(classes(frame), 'the mouse keeps its padding').toContain('py-1.5');
    const pad = spacing(frame, 'coarse:py-');
    expect(1 + pad, 'border to chip').toBeGreaterThanOrEqual(12);
    expect(2 + 2 * pad + 20, 'one row of chips').toBeLessThanOrEqual(44);
  });

  it("a removable Tag, whose cross's box reached past it on every side but the start", () => {
    // A Tag is 22px tall and the center of its cross sits 14px from its end,
    // so the cross's 44px box reaches 11px above and below the Tag and 8px
    // past its end. The Tag claims that room as margin under a finger, so in
    // a row of Tags, wrapped or not, the boxes meet whatever gap the row sets.
    const { getByLabelText } = render(Tag, {
      props: { label: 'beta', removable: true, onremove: () => {} },
    });
    const tag = getByLabelText('Remove beta').parentElement;
    expect(22 + 2 * spacing(tag, 'coarse:my-'), 'height').toBeGreaterThanOrEqual(44);
    expect(spacing(tag, 'coarse:me-'), 'past the end').toBeGreaterThanOrEqual(22 - 14);

    // A Tag with no cross has no box and takes no room.
    const plain = render(Tag, { props: { label: 'gamma' } });
    const plainTag = plain.getByText('gamma');
    expect(classes(plainTag).filter((c) => c.startsWith('coarse:'))).toEqual([]);

    // That margin made a removable Tag's box 44px tall, so a plain Tag beside
    // it in a stretching row grew to 44px, and one in a list item sat at the
    // top of the line. Every Tag centers itself, whatever its row aligns.
    expect(classes(tag)).toContain('self-center');
    expect(classes(plainTag)).toContain('self-center');
  });

  it('TimePicker segments, which were 28 by 20 with no hit box', () => {
    // An input draws no pseudo-element, so each digit segment's hit box sits
    // on the span round it. The segments spread under a finger so their
    // centers sit 44px apart: 28px, a 4px gap, an 8px colon, a 4px gap.
    for (const props of [
      {},
      { seconds: true },
      { hour12: true },
      { hour12: true, seconds: true },
    ]) {
      const { container, getByRole, unmount } = render(TimePicker, {
        props: { label: 'Starts', value: '09:30', ...props },
      });
      const group = getByRole('group');
      expect(classes(group)).toContain('coarse:gap-1');
      const inputs = container.querySelectorAll('input[data-segment]');
      expect(inputs.length).toBe(props.seconds ? 3 : 2);
      for (const input of inputs) {
        const box = input.parentElement;
        expect(box?.tagName).toBe('SPAN');
        expectHitArea(box);
      }
      for (const colon of group.querySelectorAll('span[aria-hidden="true"]')) {
        expect(classes(colon)).toContain('coarse:w-2');
        expect(classes(colon)).toContain('coarse:text-center');
      }
      const meridiem = container.querySelector('[data-segment="meridiem"]');
      if (props.hour12) {
        expectHitArea(meridiem);
        expect(classes(meridiem)).toContain('coarse:ms-2.5');
        expect(classes(meridiem)).toContain('ms-1');
      }
      unmount();
    }
  });

  it('NumberInput steppers, which left the number 40px wide inside a w-32', () => {
    // The steppers narrow under a finger and keep a 44px target, so the number
    // between them keeps its room. A mouse still sees the control-wide caps.
    const { getByLabelText } = render(NumberInput, { props: { label: 'Seats', value: 3 } });
    for (const name of ['Decrease', 'Increase']) {
      const stepper = getByLabelText(name);
      expectHitArea(stepper);
      expect(classes(stepper)).toContain('coarse:w-8');
      expect(classes(stepper)).toContain('w-control');
    }
  });

  it("NumberInput steppers' targets, which reached 6px into the number", () => {
    // A 32px stepper's 44px box, centered on it, covered the first and last
    // 6px of the number, so a tap just inside the field stepped the value.
    // Each box is pinned to the edge the stepper shares with the number and
    // grows outward. Logical sides, so a right-to-left page mirrors it.
    const { getByLabelText } = render(NumberInput, { props: { label: 'Seats', value: 3 } });
    const pinned = { Decrease: ['start-auto', 'end-0'], Increase: ['start-0', 'end-auto'] };
    for (const [name, sides] of Object.entries(pinned)) {
      const list = classes(getByLabelText(name));
      for (const side of sides) expect(list).toContain(`coarse:before:${side}`);
      expect(list).toContain('coarse:before:translate-x-0');
      expect(list).toContain('coarse:before:-translate-y-1/2');
    }
  });

  it("CopyField's Show and Copy targets, which overlapped by 15px", () => {
    // Each button is 27px with a 44px box centered on it, so they need 17px
    // between them for the boxes to meet. 2px apart, a tap on the last 7px
    // of Show copied the value. A mouse keeps the 2px.
    const { getByLabelText } = render(CopyField, {
      props: { label: 'Token', value: 'lk_0123', secret: true },
    });
    const show = getByLabelText('Show value');
    const copy = getByLabelText('Copy token');
    expectHitArea(show);
    expectHitArea(copy);
    expect(show.parentElement).toBe(copy.parentElement);
    const frame = classes(show.parentElement);
    expect(frame).toContain('gap-0.5');
    expect(frame).toContain('coarse:gap-4.25');
  });

  it("AuthShell's logo link, which was 36px tall", () => {
    // The lockup is drawn at 36px. Grown to 44px it would move the heading
    // under a mouse as well, so its hit box grows instead, as a breadcrumb's.
    const { container } = render(AuthShell, {
      props: { title: 'Sign in', href: '/', children: text('x') },
    });
    expectHitArea(container.querySelector('a[href="/"]'));
  });

  it("an Autocomplete's clear cross, which was 24px", () => {
    const { getByLabelText } = render(Autocomplete, {
      props: { label: 'Find', value: 'a', options: [{ value: 'a', label: 'Alpha' }] },
    });
    expectHitArea(getByLabelText('Clear'), 'absolute');
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

describe('Pagination on a phone held by a finger', () => {
  // Nine steps 16px apart are 380px, wider than a phone, so below the sm
  // width a finger sees at most five slots between Previous and Next. Both
  // lists are in the markup and the stylesheet picks one, so nothing moves
  // after hydration.
  type Layout = 'both' | 'fine' | 'touch';

  /** Each slot between the steps as its text and the layout that draws it. */
  function slotsOf(page: number, pages: number): { text: string; layout: Layout }[] {
    const { container } = render(Pagination, {
      props: { page, total: pages * 10, perPage: 10, onchange: () => {} },
    });
    const row = container.querySelector('[aria-label="Previous page"]')?.parentElement;
    const slots = [...(row?.children ?? [])].filter((el) => !el.hasAttribute('aria-label'));
    return slots.map((el) => {
      const list = classes(el);
      const fineOnly = list.includes('max-sm:coarse:hidden');
      const touchOnly = list.includes('hidden') && list.includes('max-sm:coarse:inline-flex');
      // A touch-only gap that also carried inline-flex would tie with hidden.
      if (touchOnly) expect(list).not.toContain('inline-flex');
      if (fineOnly) expect(list).toContain('inline-flex');
      expect(fineOnly && touchOnly).toBe(false);
      return {
        text: el.tagName === 'SPAN' ? 'gap' : (el.textContent ?? '').trim(),
        layout: fineOnly ? 'fine' : touchOnly ? 'touch' : 'both',
      };
    });
  }

  const view = (slots: { text: string; layout: Layout }[], hide: Layout) =>
    slots
      .filter((s) => s.layout !== hide)
      .map((s) => s.text)
      .join(' ');

  it.each([
    { page: 1, pages: 10, fine: '1 2 gap 10', touch: '1 gap 10' },
    { page: 3, pages: 10, fine: '1 2 3 4 gap 10', touch: '1 gap 3 gap 10' },
    { page: 5, pages: 10, fine: '1 gap 4 5 6 gap 10', touch: '1 gap 5 gap 10' },
    { page: 10, pages: 10, fine: '1 gap 9 10', touch: '1 gap 10' },
    { page: 4, pages: 7, fine: '1 2 3 4 5 6 7', touch: '1 gap 4 gap 7' },
    { page: 1, pages: 6, fine: '1 2 3 4 5 6', touch: '1 gap 6' },
    { page: 3, pages: 5, fine: '1 2 3 4 5', touch: '1 2 3 4 5' },
  ])('page $page of $pages', ({ page, pages, fine, touch }) => {
    const slots = slotsOf(page, pages);
    expect(view(slots, 'touch')).toBe(fine);
    expect(view(slots, 'fine')).toBe(touch);
    expect(touch.split(' ').length).toBeLessThanOrEqual(5);
    // One element per page, and a gap both layouts draw is one element.
    const pagesDrawn = slots.filter((s) => s.text !== 'gap').map((s) => s.text);
    expect(new Set(pagesDrawn).size).toBe(pagesDrawn.length);
  });

  it('draws a gap both layouts share once', () => {
    const slots = slotsOf(5, 10);
    expect(slots.map((s) => `${s.text}:${s.layout}`).join(' ')).toBe(
      '1:both gap:both 4:fine 5:both gap:touch 6:fine gap:fine 10:both',
    );
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

  it('SortableList handles, which a finger rests on to lift a row', () => {
    const { getByRole } = render(SortableList, {
      props: { items: [{ id: 'hero', label: 'Hero' }], label: 'Sections', row: text('Hero') },
    });
    expectGrows(getByRole('button', { name: 'Move Hero' }));
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

  it('the small SegmentedControl track, so it stays level with a small Button', () => {
    const { getByRole } = render(SegmentedControl, {
      props: {
        label: 'Range',
        size: 'sm',
        value: 'day',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ],
      },
    });
    const track = classes(getByRole('radiogroup'));
    expect(track).toContain('coarse:min-h-control');
    expect(track).toContain('h-8');
  });

  it('the option rows of Select, MultiSelect and Autocomplete, which were 36px', async () => {
    // Dropdown's menu item is the same row and already grew. The three
    // listboxes draw theirs from the shared panel row, which did not.
    const options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    const select = render(Select, { props: { label: 'One', options } });
    await fireEvent.click(select.container.querySelector('button[aria-haspopup="listbox"]')!);
    const multi = render(MultiSelect, { props: { label: 'Many', options } });
    await fireEvent.click(multi.container.querySelector('div[role="combobox"]')!);
    const auto = render(Autocomplete, { props: { label: 'Find', options } });
    await fireEvent.focus(auto.container.querySelector('input[role="combobox"]')!);
    for (const { container } of [select, multi, auto]) {
      const rows = container.querySelectorAll('[role="option"]');
      expect(rows).toHaveLength(2);
      for (const row of rows) expectGrows(row);
    }
  });

  it('TreeView rows, which were 32px', () => {
    const { container } = render(TreeView, {
      props: {
        label: 'Files',
        expanded: ['docs'],
        nodes: [
          { id: 'docs', label: 'Docs', children: [{ id: 'intro', label: 'Intro' }] },
          { id: 'readme', label: 'Readme' },
        ],
      },
    });
    const rows = container.querySelectorAll('[role="treeitem"] > div:first-child');
    expect(rows).toHaveLength(3);
    for (const row of rows) expectGrows(row);
  });

  it('the TreeView check, a 14px box beside the row it sits in', async () => {
    // A press on the check checks and a press on the rest of the row
    // activates, as Space and Enter split them. The slot grows to a 44px
    // square of its own inside the 44px row, so the check's target and the
    // row's sit side by side.
    const oncheck = vi.fn();
    const onactivate = vi.fn();
    const { container } = render(TreeView, {
      props: {
        label: 'Files',
        checkable: true,
        oncheck,
        onactivate,
        nodes: [{ id: 'readme', label: 'Readme' }],
      },
    });
    const check = container.querySelector('[data-tree-check]');
    expectGrows(check);
    expect(classes(check)).toContain('justify-center');
    const row = classes(check?.parentElement ?? null);
    expectGrows(check?.parentElement ?? null);
    // The 44px slot inside the mouse's 6px of padding made the row 56px. The
    // padding goes under a finger, so the row is the 44px it grows to.
    expect(row).toContain('py-1.5');
    expect(row).toContain('coarse:py-0');
    await fireEvent.click(check!);
    expect(oncheck).toHaveBeenCalledWith(['readme']);
    expect(onactivate).not.toHaveBeenCalled();
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
  // A pseudo-element centers on its nearest positioned ancestor. On a static
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
    // variant, `[&_thead_th_button]:hit-area`, which a constant cannot spell.
    // The variant prefix is what the pattern leaves out.
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
