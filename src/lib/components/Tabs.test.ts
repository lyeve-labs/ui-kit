import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Tabs from './Tabs.svelte';

const items = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity', count: 3 },
];

describe('Tabs', () => {
  it('renders a tab per item', () => {
    const { getAllByRole } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    expect(getAllByRole('tab')).toHaveLength(2);
  });

  it('marks the active tab as selected', () => {
    const { getByText } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    const activeTab = getByText('Overview').closest('[role="tab"]');
    expect(activeTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('renders a count badge when provided', () => {
    const { getByText } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    expect(getByText('3')).toBeTruthy();
  });

  it('fires onchange with the tab id when clicked', async () => {
    const onchange = vi.fn();
    const { getByText } = render(Tabs, { props: { items, active: 'overview', onchange } });
    await fireEvent.click(getByText('Activity'));
    expect(onchange).toHaveBeenCalledWith('activity');
  });
});

/**
 * jsdom lays nothing out, so every scroll metric it reports is 0 and no strip
 * ever overflows. These are the three numbers the component reads.
 */
function layOut(el: HTMLElement, scrollWidth: number, clientWidth: number, scrollLeft: number) {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
}

const strip = (root: ParentNode) => root.querySelector('[role="tablist"]') as HTMLElement;

const edges = (root: ParentNode) => ({
  before: root.querySelector('[data-testid="tabs-more-before"]') !== null,
  after: root.querySelector('[data-testid="tabs-more-after"]') !== null,
});

const five = ['overview', 'prices', 'prompts', 'providers', 'transcripts'].map((id) => ({
  id,
  label: id[0].toUpperCase() + id.slice(1),
}));

describe('Tabs on a screen too narrow for the strip', () => {
  it('scrolls sideways rather than wrapping', () => {
    // Five tabs are 480px. At 400px the fifth was past the edge with nothing
    // on screen to say it existed, and the workaround was a wrapped strip,
    // which breaks the one line the underline runs along.
    const { container } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    const list = strip(container);
    expect(list.getAttribute('role')).toBe('tablist');
    expect(list.className).toContain('overflow-x-auto');
    expect(list.className).not.toContain('flex-wrap');
  });

  it('never breaks a label inside itself', () => {
    const { getAllByRole } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    for (const tab of getAllByRole('tab')) {
      expect(tab.className).toContain('whitespace-nowrap');
      expect(tab.className).toContain('shrink-0');
    }
  });

  it('advertises nothing while the strip fits', async () => {
    const { container } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    const list = strip(container);
    layOut(list, 400, 400, 0);
    await fireEvent.scroll(list);
    expect(edges(container)).toEqual({ before: false, after: false });
  });

  it('fades only the edge the tabs continue past', async () => {
    const { container } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    const list = strip(container);

    layOut(list, 480, 400, 0);
    await fireEvent.scroll(list);
    expect(edges(container)).toEqual({ before: false, after: true });

    list.scrollLeft = 40;
    await fireEvent.scroll(list);
    expect(edges(container)).toEqual({ before: true, after: true });

    list.scrollLeft = 80;
    await fireEvent.scroll(list);
    expect(edges(container)).toEqual({ before: true, after: false });
  });

  it('keeps the fades out of the accessibility tree and off paper', async () => {
    const { container } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    const list = strip(container);
    layOut(list, 480, 400, 0);
    await fireEvent.scroll(list);
    const fade = container.querySelector('[data-testid="tabs-more-after"]') as HTMLElement;
    expect(fade.getAttribute('aria-hidden')).toBe('true');
    expect(fade.getAttribute('data-print')).toBe('hide');
  });

  it('brings the active tab into view when it changes', async () => {
    // A page that opens on its fifth tab must not open on a strip that hides
    // it. jsdom lays nothing out, so the strip and the tabs are given boxes:
    // the strip is 300px wide and each tab 100px.
    const { container, rerender } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    const list = strip(container);
    layOut(list, 500, 300, 0);
    list.getBoundingClientRect = () => new DOMRect(0, 0, 300, 40);
    container.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab, i) => {
      tab.getBoundingClientRect = () => new DOMRect(i * 100 - list.scrollLeft, 0, 100, 40);
    });
    await rerender({ items: five, active: 'transcripts', onchange: vi.fn() });
    expect(list.scrollLeft).toBe(200);
    await rerender({ items: five, active: 'overview', onchange: vi.fn() });
    expect(list.scrollLeft).toBe(0);
  });

  it('never scrolls the page to reach the strip', async () => {
    // scrollIntoView moves every scroll box above the tab, the page among
    // them, so a strip below the fold pulled the page down to it on open.
    const moved: string[] = [];
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      moved.push(this.dataset.tab ?? this.tagName);
    };
    try {
      const { rerender } = render(Tabs, {
        props: { items: five, active: 'prices', onchange: vi.fn() },
      });
      await rerender({ items: five, active: 'transcripts', onchange: vi.fn() });
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
    expect(moved).toEqual([]);
  });

  it('draws the focus ring inside the tab, where the scroll box cannot clip it', () => {
    const { getAllByRole } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    expect(getAllByRole('tab')[0].className).toContain('focus-visible:ring-inset');
  });

  it('leaves the rule to a header row it sits in and takes the row height', () => {
    // In a pane header the row draws the rule, and a strip that drew its own
    // put two lines under the tabs and stood the row 2px taller than its
    // neighbor.
    const props = { items: five, active: 'overview', onchange: vi.fn() };
    const ruled = strip(render(Tabs, { props }).container);
    expect(ruled.className).toContain('border-b');
    expect(ruled.querySelector('[role="tab"]')!.className).toContain('py-2.5');
    cleanup();
    const inRow = strip(render(Tabs, { props: { ...props, inHeader: true } }).container);
    expect(inRow.className).not.toContain('border-b');
    expect(inRow.className).toContain('h-full');
    const tab = inRow.querySelector('[role="tab"]')!;
    expect(tab.className).toContain('h-full');
    expect(tab.className).not.toContain('py-2.5');
  });

  it('renders the count at the 12px floor', () => {
    const { getByText } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    expect(getByText('3').className).toContain('text-xs');
    expect(getByText('3').className).not.toContain('text-[10px]');
  });

  it('puts the caller class on the frame, so a margin does not scroll', () => {
    const { container } = render(Tabs, {
      props: { items, active: 'overview', class: 'mb-4', onchange: vi.fn() },
    });
    expect(container.firstElementChild?.className).toContain('mb-4');
    expect(strip(container).className).not.toContain('mb-4');
  });
});

/*
 * The WAI-ARIA tabs pattern. The strip is one stop in the tab order, the
 * arrows walk it and wrap, and Home and End go to the ends. A move only
 * moves focus: two consoles navigate to another page when a tab is chosen,
 * so a key that chose would leave the page under the reader's finger.
 */
describe('Tabs from the keyboard', () => {
  const stops = (tabs: HTMLElement[]) => tabs.filter((t) => t.tabIndex === 0);

  function mount(active = 'prices') {
    const onchange = vi.fn();
    const view = render(Tabs, { props: { items: five, active, onchange } });
    const tabs = view.getAllByRole('tab') as HTMLElement[];
    return { ...view, tabs, onchange };
  }

  it('takes one tab stop, on the selected tab', () => {
    const { tabs } = mount('prompts');
    expect(stops(tabs)).toEqual([tabs[2]]);
    for (const tab of tabs) {
      expect(tab.getAttribute('tabindex')).toBe(tab === tabs[2] ? '0' : '-1');
    }
  });

  it('keeps one stop on the first tab when no tab is selected', () => {
    const { tabs } = mount('missing');
    expect(stops(tabs)).toEqual([tabs[0]]);
  });

  it.each([
    ['ArrowRight', 1, 2],
    ['ArrowLeft', 1, 0],
    ['Home', 3, 0],
    ['End', 1, 4],
  ])('moves focus with %s from tab %i to tab %i', async (key, from, to) => {
    const { tabs, onchange } = mount(five[from].id);
    tabs[from].focus();
    await fireEvent.keyDown(tabs[from], { key });
    expect(document.activeElement).toBe(tabs[to]);
    expect(stops(tabs)).toEqual([tabs[to]]);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('wraps from the last tab to the first and back', async () => {
    const { tabs } = mount('transcripts');
    tabs[4].focus();
    await fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[0]);
    await fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[4]);
  });

  it('keeps the page still when a key moves along the strip', async () => {
    const { tabs } = mount('overview');
    tabs[0].focus();
    const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    tabs[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves other keys to the browser', async () => {
    const { tabs, onchange } = mount('overview');
    tabs[0].focus();
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    tabs[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(tabs[0]);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('returns the stop to the selected tab when focus leaves the strip', async () => {
    const { tabs } = mount('prices');
    const outside = document.createElement('button');
    document.body.append(outside);
    try {
      tabs[1].focus();
      await fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
      expect(stops(tabs)).toEqual([tabs[2]]);
      outside.focus();
      await fireEvent.focusOut(tabs[2], { relatedTarget: outside });
      expect(stops(tabs)).toEqual([tabs[1]]);
    } finally {
      outside.remove();
    }
  });

  it('chooses the focused tab on a press, never on a move', async () => {
    const { tabs, onchange } = mount('overview');
    tabs[0].focus();
    await fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(document.activeElement as HTMLElement);
    expect(onchange).toHaveBeenCalledExactlyOnceWith('prices');
  });
});

/*
 * One underline for the strip. It was an underline drawn under each tab, so
 * a change of tab took the line from one tab and put it under the next in one
 * frame. jsdom lays nothing out, so each case gives the strip and its tabs
 * boxes: the strip is 400px wide and each tab 100px, side by side.
 */
describe('Tabs underline', () => {
  const UNDERLINE = 'after:bg-accent';
  let observers: (() => void)[] = [];

  class FakeResizeObserver {
    constructor(private readonly cb: () => void) {
      observers.push(() => this.cb());
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  beforeEach(() => {
    observers = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  const indicator = (root: ParentNode) =>
    strip(root).querySelector<HTMLElement>(':scope > [aria-hidden="true"] > span');

  /** Gives the strip's anchor and every tab a box, tab i at i * width. */
  function lay(root: ParentNode, width = () => 100) {
    const anchor = strip(root).querySelector<HTMLElement>(':scope > [aria-hidden="true"]')!;
    anchor.getBoundingClientRect = () => new DOMRect(0, 38, 400, 2);
    root.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab, i) => {
      tab.getBoundingClientRect = () => new DOMRect(i * width(), 0, width(), 40);
    });
  }

  const resize = async () => {
    for (const fire of observers) fire();
    await tick();
  };

  /**
   * A right-to-left page. A browser gives an element under dir="rtl" the
   * computed direction rtl, and jsdom neither applies that rule nor inherits
   * the property, so the page states it for every element in it.
   */
  function rtlPage() {
    const page = document.createElement('div');
    page.setAttribute('dir', 'rtl');
    const rule = document.createElement('style');
    rule.textContent = '[dir="rtl"], [dir="rtl"] * { direction: rtl }';
    page.append(rule);
    document.body.append(page);
    return page;
  }

  it('draws the underline under the chosen tab until the strip is measured', () => {
    // A server render and a page whose scripts never run measure nothing, and
    // the chosen tab still shows its line there.
    const { getAllByRole, container } = render(Tabs, {
      props: { items: five, active: 'prices', onchange: vi.fn() },
    });
    const tabs = getAllByRole('tab');
    expect(tabs[1].className).toContain(UNDERLINE);
    expect(tabs[0].className).not.toContain(UNDERLINE);
    expect(indicator(container)).toBeNull();
  });

  it('hands the line to one indicator under the chosen tab once measured', async () => {
    const { getAllByRole, container } = render(Tabs, {
      props: { items: five, active: 'prices', onchange: vi.fn() },
    });
    lay(container);
    await resize();
    const bar = indicator(container)!;
    expect(bar).not.toBeNull();
    expect(bar.style.transform).toBe('translateX(100px) scaleX(0.25)');
    for (const tab of getAllByRole('tab')) expect(tab.className).not.toContain(UNDERLINE);
    // Placed where it starts, never traveling in from the start of the strip.
    expect(bar.className).not.toContain('transition-transform');
  });

  it('travels to the next tab on transform and the base rung', async () => {
    const { container, rerender } = render(Tabs, {
      props: { items: five, active: 'prices', onchange: vi.fn() },
    });
    lay(container);
    await resize();
    await rerender({ items: five, active: 'providers', onchange: vi.fn() });
    const bar = indicator(container)!;
    expect(bar.style.transform).toBe('translateX(300px) scaleX(0.25)');
    expect(bar.className).toContain('transition-transform');
    expect(bar.className).toContain('duration-base');
    expect(bar.style.left).toBe('');
    expect(bar.style.width).toBe('');
  });

  it('follows a change of size at once rather than traveling', async () => {
    // A font arriving or a label changing moves the tab under the line, and
    // the line has to be there in the same frame.
    let w = 100;
    const { container, rerender } = render(Tabs, {
      props: { items: five, active: 'prices', onchange: vi.fn() },
    });
    lay(container, () => w);
    await resize();
    await rerender({ items: five, active: 'providers', onchange: vi.fn() });
    w = 80;
    await resize();
    const bar = indicator(container)!;
    expect(bar.style.transform).toBe('translateX(240px) scaleX(0.2)');
    expect(bar.className).not.toContain('transition-transform');
  });

  it('runs from the start edge of the tab in a right-to-left strip', async () => {
    // The accent runs from the reading start, so the line is mirrored by the
    // same rtl: scale as a tab's own line. The scale applies after the
    // transform, so the box is placed at the mirror of the tab.
    const page = rtlPage();
    try {
      const { container } = render(Tabs, {
        target: page,
        props: { items: five, active: 'prices', onchange: vi.fn() },
      });
      lay(container);
      await resize();
      const bar = indicator(container)!;
      expect(bar.style.transform).toBe('translateX(-200px) scaleX(0.25)');
      expect(bar.className).toContain('rtl:-scale-x-100');
    } finally {
      page.remove();
    }
  });

  it('places the line on an engine that has no :dir() selector', async () => {
    // An engine without :dir() throws on the selector, and the line is placed
    // from an effect and a resize callback, so one throw left the strip bare.
    const matches = Element.prototype.matches;
    const spy = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      if (selector.includes(':dir('))
        throw new SyntaxError(`'${selector}' is not a valid selector`);
      return matches.call(this, selector);
    });
    const page = rtlPage();
    try {
      const { container } = render(Tabs, {
        target: page,
        props: { items: five, active: 'prices', onchange: vi.fn() },
      });
      lay(container);
      await resize();
      expect(indicator(container)!.style.transform).toBe('translateX(-200px) scaleX(0.25)');
    } finally {
      page.remove();
      spy.mockRestore();
    }
  });

  it('draws no line when no tab is chosen', async () => {
    const { getAllByRole, container } = render(Tabs, {
      props: { items: five, active: 'missing', onchange: vi.fn() },
    });
    lay(container);
    await resize();
    expect(indicator(container)).toBeNull();
    for (const tab of getAllByRole('tab')) expect(tab.className).not.toContain(UNDERLINE);
  });
});
