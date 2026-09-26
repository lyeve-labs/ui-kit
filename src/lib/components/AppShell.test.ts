import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AppShell from './AppShell.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/**
 * jsdom answers every media query with `matches: false`, so the shell believes
 * it is on a desktop unless a test says otherwise. That is also the server's
 * belief, which is the behavior worth pinning: an inert sidebar in the
 * server-rendered page is unreachable to a reader whose JavaScript never runs.
 */
function viewport(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: mobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const base = {
  section: 'Dashboard',
  brand: text('LyEve'),
  nav: text('Nav'),
  children: text('Body'),
};

beforeEach(() => viewport(false));

describe('AppShell', () => {
  it('renders its children inside the one main landmark', () => {
    const { container, getByText } = render(AppShell, { props: base });
    const mains = container.querySelectorAll('main');
    expect(mains).toHaveLength(1);
    expect(getByText('Body')).toBeTruthy();
    expect(mains[0].contains(container.querySelector('#content'))).toBe(true);
  });

  it('renders no heading of its own', () => {
    // The page's own PageShell owns the h1. A shell that renders a second one
    // makes every heading query answer with two elements and a screen reader
    // announce the page name twice.
    const { container } = render(AppShell, { props: base });
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0);
    expect(container.querySelector('[data-testid="app-section"]')?.textContent?.trim()).toBe(
      'Dashboard',
    );
  });

  it('renders exactly one aside, at either width', () => {
    // Rendering a second copy for the drawer puts every nav link in the page
    // twice, which is what a strict-mode locator trips on and what a screen
    // reader reads out.
    const desktop = render(AppShell, { props: base });
    expect(desktop.container.querySelectorAll('aside')).toHaveLength(1);
    desktop.unmount();

    viewport(true);
    const mobile = render(AppShell, { props: { ...base, navOpen: true } });
    expect(mobile.container.querySelectorAll('aside')).toHaveLength(1);
  });

  it('leaves the sidebar reachable when the browser never answers', () => {
    const { container } = render(AppShell, { props: base });
    const aside = container.querySelector('aside')!;
    expect(aside.hasAttribute('inert')).toBe(false);
    expect(aside.getAttribute('aria-hidden')).toBe(null);
  });

  it('gives the drawer the dialog role and its own name', () => {
    // The role goes on the wrapper, not on the aside: a complementary landmark
    // cannot take an interactive role, and the a11y gate rejects the build that
    // tries. The drawer also names itself rather than borrowing the region's
    // name, because while it is open "Navigation" is what a reader needs.
    viewport(true);
    const { container } = render(AppShell, { props: { ...base, navOpen: true } });
    const dialogs = container.querySelectorAll('[role="dialog"]');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].getAttribute('aria-modal')).toBe('true');
    expect(dialogs[0].getAttribute('aria-label')).toBe('Navigation');
    expect(dialogs[0].querySelector('aside')).toBeTruthy();
    expect(container.querySelector('aside')!.getAttribute('role')).toBe(null);
  });

  it('shows the menu button only where the sidebar is a drawer', () => {
    const desktop = render(AppShell, { props: base });
    expect(desktop.queryByLabelText('Open navigation')).toBeNull();
    desktop.unmount();

    viewport(true);
    const mobile = render(AppShell, { props: base });
    expect(mobile.getByLabelText('Open navigation').getAttribute('aria-expanded')).toBe('false');
  });

  it('puts the skip link first in the document', () => {
    // Without it a keyboard reader tabs the whole sidebar again on every page,
    // and a skip link that is not first is one the reader reaches too late.
    const { container } = render(AppShell, { props: base });
    const first = container.querySelector('a');
    expect(first?.getAttribute('href')).toBe('#content');
    expect(container.querySelector('#content')).toBeTruthy();
  });

  it('gives the skip link a target that can hold focus', () => {
    // A fragment link scrolls to its target and focuses it only if the target
    // is focusable. Without this the page moved and focus stayed on the body,
    // so the next Tab restarted at the top: the sidebar the reader had just
    // asked to skip. It reaches all three consoles from here.
    const { container } = render(AppShell, { props: base });
    const main = container.querySelector('#content') as HTMLElement;
    expect(main.tagName).toBe('MAIN');
    expect(main.getAttribute('tabindex')).toBe('-1');
    // A landing, not a control: the browser's default outline boxed the
    // whole page body the moment the skip link was used.
    expect(main.className).toContain('outline-none');

    // Focusable on demand and never a tab stop of its own.
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it('omits the header actions row and the sidebar bands when nothing fills them', () => {
    const { container } = render(AppShell, { props: { children: text('Body') } });
    const header = container.querySelector('header')!;
    expect(header.children).toHaveLength(1);
    expect(container.querySelectorAll('aside > div')).toHaveLength(0);
  });

  it('renders the brand, the nav and the sidebar footer inside the aside', () => {
    const { container } = render(AppShell, {
      props: { ...base, sidebarFooter: text('DB synced'), headerActions: text('Toggle') },
    });
    const aside = container.querySelector('aside')!;
    expect(aside.textContent).toContain('LyEve');
    expect(aside.textContent).toContain('Nav');
    expect(aside.textContent).toContain('DB synced');
    expect(container.querySelector('header')!.textContent).toContain('Toggle');
  });
  it('offers no collapse control until a caller asks for one', () => {
    const { queryByTestId } = render(AppShell, { props: base });
    expect(queryByTestId('app-sidebar-toggle')).toBeNull();
  });

  it('puts the sidebar away above md: and keeps the control that brings it back', async () => {
    const { container, getByLabelText } = render(AppShell, {
      props: { ...base, collapsible: true },
    });
    await fireEvent.click(getByLabelText('Hide sidebar'));
    expect(container.querySelector('aside')).toBeNull();
    expect(getByLabelText('Show sidebar').getAttribute('aria-expanded')).toBe('false');
  });

  it('puts the header away above md: when asked, and the page keeps the way back', () => {
    const { container } = render(AppShell, {
      props: { ...base, collapsible: true, collapsed: true, headerHidden: true },
    });
    expect(container.querySelector('header')).toBeNull();
    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('main')).toBeTruthy();
  });

  it('keeps the header below md: whatever headerHidden says, since it carries the hamburger', () => {
    viewport(true);
    const { container, getByLabelText } = render(AppShell, {
      props: { ...base, headerHidden: true },
    });
    expect(container.querySelector('header')).toBeTruthy();
    expect(getByLabelText('Open navigation')).toBeTruthy();
  });

  it('ignores collapsed below md:, where the same aside is the drawer', () => {
    // Honoring it there leaves the hamburger opening nothing, and the drawer
    // is the only way to the nav at that width.
    viewport(true);
    const { getByLabelText, queryByTestId } = render(AppShell, {
      props: { ...base, collapsible: true, collapsed: true, navOpen: true },
    });
    expect(getByLabelText('Close navigation')).toBeTruthy();
    expect(queryByTestId('app-sidebar-toggle')).toBeNull();
  });
});

describe('AppShell reads in both directions', () => {
  /*
   * The skip link is the first focusable thing in the document. It pinned
   * itself to the physical top left, which in a right-to-left page is the far
   * corner from where the reader is looking.
   */
  it('puts the skip link on the start edge', () => {
    const { container } = render(AppShell, { props: base });
    const skip = container.querySelector('a[href="#content"]') as HTMLElement;
    expect(skip.className).toContain('focus:start-3');
    expect(skip.className).not.toContain('focus:left-3');
  });
});

describe('AppShell header controls answer a finger', () => {
  /*
   * `hover:` compiles inside `@media (hover: hover)`, so on the phone where
   * the hamburger is the only way into the nav it never matched anything.
   */
  it('gives the sidebar toggle a held state', () => {
    const { container } = render(AppShell, { props: { ...base, collapsible: true } });
    const toggle = container.querySelector('[data-testid="app-sidebar-toggle"]') as HTMLElement;
    expect(toggle.className).toMatch(/\bactive:/);
  });
});

/**
 * The shell asks two questions of the browser: is this below md:, and is it
 * between md: and lg:. This answers each by name, where `viewport` above
 * answers both the same way.
 */
function width(kind: 'phone' | 'tablet' | 'desktop') {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width: 767px')
      ? kind === 'phone'
      : query.includes('max-width: 1023px')
        ? kind === 'tablet'
        : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/**
 * A nav that reports what the shell told it, the way a SidebarNav reads
 * `collapsed`. A raw snippet renders once, so it reports the first answer;
 * the aside's own width class is read for what the shell says afterwards,
 * and both come from the same derived value.
 */
const tellingNav = createRawSnippet<[{ rail: boolean }]>((state) => ({
  render: () => `<nav data-testid="nav" data-rail="${state().rail}"><a href="/a">A</a></nav>`,
}));

const railBase = { ...base, nav: tellingNav };
const aside = (root: ParentNode) =>
  root.querySelector('[data-testid="app-sidebar"]') as HTMLElement;
const navRail = (root: ParentNode) =>
  root.querySelector('[data-testid="nav"]')?.getAttribute('data-rail');
const railBox = (root: ParentNode) => root.querySelector('[data-testid="app-rail"]') as HTMLElement;

describe('AppShell between md: and lg:', () => {
  it('narrows the sidebar to the icon rail and tells the nav so', () => {
    // At 768px the 224px column left the page 496px, and a flow editor with
    // two docked panes had no canvas at all. The theme had named the 56px
    // rail and nothing used it.
    width('tablet');
    const { container } = render(AppShell, { props: railBase });
    expect(aside(container).className).toContain('w-nav-rail');
    expect(aside(container).className).not.toContain('w-sidebar');
    expect(navRail(container)).toBe('true');
    expect(railBox(container).className).toContain('w-nav-rail');
  });

  it('opens to the full column over the page under a pointer, and closes when it leaves', async () => {
    width('tablet');
    const { container } = render(AppShell, { props: railBase });
    await fireEvent.pointerEnter(railBox(container));
    expect(aside(container).className).toContain('w-sidebar');
    // Over the page, not beside it: the column keeps the rail's width so the
    // page does not move 168px on every pass of the pointer.
    expect(railBox(container).className).toContain('w-nav-rail');
    expect(aside(container).parentElement?.className).toContain('absolute');
    expect(aside(container).parentElement?.className).toContain('z-dropdown');

    await fireEvent.pointerLeave(railBox(container));
    expect(aside(container).className).toContain('w-nav-rail');
  });

  it('opens for the keyboard and stays open while focus moves inside it', async () => {
    width('tablet');
    const { container } = render(AppShell, { props: railBase });
    const link = container.querySelector('[data-testid="nav"] a') as HTMLElement;
    await fireEvent.focusIn(railBox(container), { target: link });
    expect(aside(container).className).toContain('w-sidebar');

    await fireEvent.focusOut(railBox(container), { relatedTarget: link });
    expect(aside(container).className).toContain('w-sidebar');

    await fireEvent.focusOut(railBox(container), {
      relatedTarget: container.querySelector('main'),
    });
    expect(aside(container).className).toContain('w-nav-rail');
  });

  it('keeps the full column above lg: and the drawer below md:', () => {
    width('desktop');
    const desktop = render(AppShell, { props: railBase });
    expect(aside(desktop.container).className).toContain('w-sidebar');
    expect(navRail(desktop.container)).toBe('false');
    expect(railBox(desktop.container)).toBeNull();
    desktop.unmount();

    width('phone');
    const phone = render(AppShell, { props: { ...railBase, navOpen: true } });
    expect(phone.container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(aside(phone.container).className).toContain('w-sidebar');
    expect(navRail(phone.container)).toBe('false');
    expect(railBox(phone.container)).toBeNull();
  });

  it('lets a page ask for the rail at every width above md:', () => {
    // The flow editor's focus mode wanted this and hid the sidebar instead.
    width('desktop');
    const { container } = render(AppShell, { props: { ...railBase, rail: true } });
    expect(aside(container).className).toContain('w-nav-rail');
    expect(navRail(container)).toBe('true');
  });

  it('ignores the rail request below md:, where the sidebar is the drawer', () => {
    width('phone');
    const { container } = render(AppShell, { props: { ...railBase, rail: true, navOpen: true } });
    expect(aside(container).className).toContain('w-sidebar');
    expect(navRail(container)).toBe('false');
  });

  it('still puts the sidebar away when a collapsible shell is collapsed', () => {
    width('tablet');
    const { container } = render(AppShell, {
      props: { ...railBase, collapsible: true, collapsed: true },
    });
    expect(container.querySelector('aside')).toBeNull();
    expect(railBox(container)).toBeNull();
  });

  it('tells the brand row and the footer band as well, and clips them on the rail', () => {
    const telling = (name: string) =>
      createRawSnippet<[{ rail: boolean }]>((state) => ({
        render: () => `<span data-testid="${name}">${state().rail ? 'mark' : 'wordmark'}</span>`,
      }));
    width('tablet');
    const { getByTestId } = render(AppShell, {
      props: { ...railBase, brand: telling('brand'), sidebarFooter: telling('foot') },
    });
    expect(getByTestId('brand').textContent).toBe('mark');
    expect(getByTestId('foot').textContent).toBe('mark');
    expect(getByTestId('brand').parentElement?.className).toContain('overflow-hidden');
    expect(getByTestId('foot').parentElement?.className).toContain('overflow-hidden');
  });

  it('renders a nav written for the old contract, which took no argument', () => {
    width('tablet');
    const { getByText } = render(AppShell, { props: base });
    expect(getByText('Nav')).toBeTruthy();
  });
});
