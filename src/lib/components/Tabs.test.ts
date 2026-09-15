import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
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

const strip = (root: ParentNode) =>
  root.querySelector('[data-testid="tabs-scroll"]') as HTMLElement;

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
    // it. jsdom has no scrollIntoView, so one is given to the tab.
    const seen: string[] = [];
    const { container, rerender } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    for (const tab of container.querySelectorAll<HTMLElement>('[role="tab"]')) {
      tab.scrollIntoView = () => seen.push(tab.dataset.tab ?? '');
    }
    await rerender({ items: five, active: 'transcripts', onchange: vi.fn() });
    expect(seen.at(-1)).toBe('transcripts');
  });

  it('draws the focus ring inside the tab, where the scroll box cannot clip it', () => {
    const { getAllByRole } = render(Tabs, {
      props: { items: five, active: 'overview', onchange: vi.fn() },
    });
    expect(getAllByRole('tab')[0].className).toContain('focus-visible:ring-inset');
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
