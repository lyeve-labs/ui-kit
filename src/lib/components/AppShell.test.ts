import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AppShell from './AppShell.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

/**
 * jsdom answers every media query with `matches: false`, so the shell believes
 * it is on a desktop unless a test says otherwise. That is also the server's
 * belief, which is the behaviour worth pinning: an inert sidebar in the
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

  it('ignores collapsed below md:, where the same aside is the drawer', () => {
    // Honouring it there leaves the hamburger opening nothing, and the drawer
    // is the only way to the nav at that width.
    viewport(true);
    const { getByLabelText, queryByTestId } = render(AppShell, {
      props: { ...base, collapsible: true, collapsed: true, navOpen: true },
    });
    expect(getByLabelText('Close navigation')).toBeTruthy();
    expect(queryByTestId('app-sidebar-toggle')).toBeNull();
  });
});
