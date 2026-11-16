import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import Toolbar from './Toolbar.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe('Toolbar', () => {
  it('carries role toolbar', () => {
    const { container, getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    expect(getByRole('toolbar')).toBe(rootOf(container));
  });

  it('carries its accessible name', () => {
    // Two toolbars on one page are announced identically without it, so a
    // screen reader user cannot tell the table filters from the bulk actions.
    const { getByRole } = render(Toolbar, {
      props: { label: 'Content filters', children: text('Filters') },
    });
    const toolbar = getByRole('toolbar', { name: 'Content filters' });
    expect(toolbar.getAttribute('aria-label')).toBe('Content filters');
  });

  it('omits aria-label when it has no name to give', () => {
    // An empty aria-label is announced as an unnamed toolbar and hides
    // whatever a container above it had already named.
    const { getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    expect(getByRole('toolbar').hasAttribute('aria-label')).toBe(false);
  });

  it('aligns its controls on their vertical centers', () => {
    // The defect it replaces: hand-rolled filter rows stretched or top-aligned
    // their children, so a search box, a select and a button sat off by a
    // couple of pixels from each other.
    const { getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    const cls = getByRole('toolbar').className;
    expect(cls).toContain('items-center');
    expect(cls).not.toContain('items-start');
    expect(cls).not.toContain('items-stretch');
  });

  it('wraps on a narrow viewport rather than overflowing', () => {
    // A row that overflows takes a horizontal scrollbar the user has to find
    // before the last filter can be reached.
    const { getByRole } = render(Toolbar, { props: { children: text('Filters') } });
    const cls = getByRole('toolbar').className;
    expect(cls).toContain('flex-wrap');
    expect(cls).not.toContain('overflow-x-auto');
    expect(cls).not.toContain('flex-nowrap');
  });

  it('makes its children flex items of the row itself', () => {
    // A wrapper would align its own contents and leave the toolbar aligning
    // one box, which is how a filter row loses the alignment it exists for.
    const { getByRole, getByText } = render(Toolbar, { props: { children: text('Search') } });
    expect(getByText('Search').parentElement).toBe(getByRole('toolbar'));
  });

  it('pushes the actions to the trailing edge', () => {
    const { getByRole, getByText } = render(Toolbar, {
      props: { children: text('Search'), actions: text('Export') },
    });
    const group = getByText('Export').parentElement as HTMLElement;
    expect(group.className).toContain('ms-auto');
    expect(group.parentElement).toBe(getByRole('toolbar'));
    const search = getByText('Search');
    expect(search.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('renders no actions group when there are no actions', () => {
    const { getByRole } = render(Toolbar, { props: { children: text('Search') } });
    expect(getByRole('toolbar').children).toHaveLength(1);
  });

  it('accepts a consumer class without competing with a built-in utility', () => {
    // A margin is safe here because the toolbar states none. Two utilities for
    // one property resolve by the order Tailwind emits them.
    const { getByRole } = render(Toolbar, {
      props: { class: 'mb-4', children: text('Filters') },
    });
    const cls = getByRole('toolbar').className.split(/\s+/).filter(Boolean);
    expect(cls).toContain('mb-4');
    expect(cls.filter((c) => c !== 'mb-4').some((c) => /^-?m[trblxy]?-/.test(c))).toBe(false);
  });
});

/** A row of buttons in one element, since a raw snippet renders one root. */
const buttons = (html: string) =>
  createRawSnippet(() => ({ render: () => `<span>${html}</span>` }));

const ROW =
  '<button>Bold</button><button>Italic</button><button disabled>Link</button><button>Insert</button>';

function roving(html = ROW) {
  const result = render(Toolbar, {
    props: { label: 'Text formatting', roving: true, children: buttons(html) },
  });
  const button = (name: string) => result.getByRole('button', { name }) as HTMLButtonElement;
  const stops = () =>
    [...result.getByRole('toolbar').querySelectorAll('button')].filter((b) => b.tabIndex === 0);
  return { ...result, button, stops };
}

/** The observer that places the stop again reports on a microtask. */
const settled = () => tick().then(() => Promise.resolve());

describe('Toolbar with roving focus', () => {
  it('leaves every button in the tab sequence without it', () => {
    const { getByRole } = render(Toolbar, { props: { children: buttons(ROW) } });
    for (const b of getByRole('toolbar').querySelectorAll('button')) {
      expect(b.hasAttribute('tabindex')).toBe(false);
    }
  });

  it('is one Tab stop, on the first enabled button', () => {
    const { button, stops } = roving('<button disabled>Undo</button>' + ROW);
    expect(stops()).toEqual([button('Bold')]);
    expect(button('Undo').tabIndex).toBe(-1);
  });

  it('moves with Left and Right, wraps at the ends and skips a disabled button', async () => {
    const { button, stops } = roving();
    button('Bold').focus();
    await fireEvent.keyDown(button('Bold'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(button('Italic'));
    // Link is disabled, so Right from Italic lands on Insert.
    await fireEvent.keyDown(button('Italic'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(button('Insert'));
    await fireEvent.keyDown(button('Insert'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(button('Bold'));
    await fireEvent.keyDown(button('Bold'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(button('Insert'));
    expect(stops()).toEqual([button('Insert')]);
  });

  it('jumps to the ends with Home and End', async () => {
    const { button, stops } = roving();
    button('Italic').focus();
    await fireEvent.keyDown(button('Italic'), { key: 'End' });
    expect(document.activeElement).toBe(button('Insert'));
    await fireEvent.keyDown(button('Insert'), { key: 'Home' });
    expect(document.activeElement).toBe(button('Bold'));
    expect(stops()).toEqual([button('Bold')]);
  });

  it('claims only the keys it moves on', async () => {
    const { button } = roving();
    button('Bold').focus();
    const right = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    const down = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    button('Bold').dispatchEvent(right);
    button('Italic').dispatchEvent(down);
    expect(right.defaultPrevented).toBe(true);
    expect(down.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(button('Italic'));
  });

  it('keeps the stop on the button last used', async () => {
    const { button, stops } = roving();
    button('Insert').focus();
    await fireEvent.focusIn(button('Insert'));
    expect(stops()).toEqual([button('Insert')]);
  });

  it('moves the stop to the first enabled button when the stop turns disabled', async () => {
    // A disabled button cannot take focus, so a stop left on one would take
    // the whole row out of the tab sequence.
    const { button, stops } = roving();
    button('Insert').focus();
    await fireEvent.focusIn(button('Insert'));
    button('Insert').disabled = true;
    await settled();
    expect(stops()).toEqual([button('Bold')]);
  });

  it('takes a button that arrives later out of the tab sequence', async () => {
    const { getByRole, stops, button } = roving();
    const late = document.createElement('button');
    late.textContent = 'Table';
    getByRole('toolbar').append(late);
    await settled();
    expect(late.tabIndex).toBe(-1);
    expect(stops()).toEqual([button('Bold')]);
  });

  it('leaves the buttons of an open menu to the menu', async () => {
    const { button, getByRole } = roving(
      '<button>Bold</button><span role="menu"><button>Heading</button><button>Quote</button></span>',
    );
    expect(getByRole('menu').querySelectorAll('[tabindex]')).toHaveLength(0);
    const heading = button('Heading');
    heading.focus();
    await fireEvent.focusIn(heading);
    await fireEvent.keyDown(heading, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(heading);
    expect(button('Bold').tabIndex).toBe(0);
  });

  it('leaves the radios of a group in the row to the group', async () => {
    const { button, getByRole } = roving(
      '<button>Bold</button><span role="radiogroup"><button role="radio">Left</button><button role="radio">Center</button></span>',
    );
    expect(getByRole('radiogroup').querySelectorAll('[tabindex]')).toHaveLength(0);
    const left = getByRole('radio', { name: 'Left' });
    left.focus();
    await fireEvent.focusIn(left);
    await fireEvent.keyDown(left, { key: 'End' });
    expect(document.activeElement).toBe(left);
    expect(button('Bold').tabIndex).toBe(0);
  });

  it('still roves inside a dialog around it', () => {
    const dialog = document.body.appendChild(document.createElement('div'));
    dialog.setAttribute('role', 'dialog');
    const { getByRole } = render(Toolbar, {
      target: dialog,
      props: { roving: true, children: buttons(ROW) },
    });
    const tabs = [...getByRole('toolbar').querySelectorAll('button')].map((b) => b.tabIndex);
    expect(tabs).toEqual([0, -1, -1, -1]);
    dialog.remove();
  });

  it.each(['altKey', 'ctrlKey', 'metaKey'])(
    'leaves the keys to the browser with %s held',
    (mod) => {
      // Alt+ArrowLeft is Back.
      const { button } = roving();
      button('Italic').focus();
      const left = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        [mod]: true,
        bubbles: true,
        cancelable: true,
      });
      button('Italic').dispatchEvent(left);
      expect(left.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(button('Italic'));
    },
  );

  it('puts the focus on the new stop when the focused button goes', async () => {
    const { button } = roving();
    const insert = button('Insert');
    insert.focus();
    await fireEvent.focusIn(insert);
    insert.remove();
    await settled();
    expect(document.activeElement).toBe(button('Bold'));
  });

  it('leaves the focus where the reader took it when the old stop turns disabled', async () => {
    const outside = document.body.appendChild(document.createElement('button'));
    const { button } = roving();
    button('Insert').focus();
    await fireEvent.focusIn(button('Insert'));
    outside.focus();
    await fireEvent.focusOut(button('Insert'), { relatedTarget: outside });
    button('Insert').disabled = true;
    await settled();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('focuses its stop when asked, for a shortcut that reaches the row from elsewhere', async () => {
    const { component, button } = roving();
    button('Italic').focus();
    await fireEvent.focusIn(button('Italic'));
    button('Italic').blur();
    expect(component.focus()).toBe(true);
    expect(document.activeElement).toBe(button('Italic'));
  });

  it('reports no stop in a row with no enabled button', () => {
    const { component } = roving('<button disabled>Bold</button>');
    expect(component.focus()).toBe(false);
  });
});

describe('a tight Toolbar', () => {
  it('packs its controls 2px apart on one line', () => {
    // A formatting row is a strip of icon buttons. The filter row's 12px gap
    // and wrap spread it into a second row inside a narrow bar.
    const { getByRole, getByText } = render(Toolbar, {
      props: { tight: true, children: text('Bold'), actions: text('More') },
    });
    for (const el of [getByRole('toolbar'), getByText('More').parentElement as HTMLElement]) {
      const cls = el.className.split(/\s+/);
      expect(cls).toContain('gap-0.5');
      expect(cls).not.toContain('flex-wrap');
      expect(cls.filter((c) => c.startsWith('gap-'))).toEqual(['gap-0.5']);
    }
  });

  it('wraps when the caller asks, with no wrap utility of its own to compete', () => {
    const { getByRole } = render(Toolbar, {
      props: { tight: true, class: 'flex-wrap', children: text('Bold') },
    });
    const cls = getByRole('toolbar').className.split(/\s+/);
    expect(cls.filter((c) => c.startsWith('flex-') && c !== 'flex')).toEqual(['flex-wrap']);
  });
});
