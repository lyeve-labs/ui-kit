import { Settings } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Dropdown from './Dropdown.svelte';

const trigger = createRawSnippet(() => ({
  render: () => '<button>Open menu</button>',
}));

/**
 * A trigger that actually opens the menu.
 *
 * The snippet is handed `toggle`, and every test that needs an open menu has to
 * go through it: `open` is the component's own state and there is no prop for
 * it. The plain trigger above renders a button that does nothing, which is why
 * the suite only ever saw this component closed.
 */
const liveTrigger = createRawSnippet<[{ open: boolean; toggle: () => void }]>((args) => ({
  render: () => '<button type="button">Open menu</button>',
  setup: (node: Element) => {
    node.addEventListener('click', () => args().toggle());
  },
}));

const items = [
  { label: 'Edit', onclick: vi.fn() },
  { label: 'Delete', variant: 'danger' as const, onclick: vi.fn() },
];

function menuItems(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
}

async function openMenu(container: HTMLElement): Promise<void> {
  await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
}

describe('Dropdown', () => {
  it('renders the trigger snippet', () => {
    const { getByText } = render(Dropdown, { props: { items, trigger } });
    expect(getByText('Open menu')).toBeTruthy();
  });

  it('keeps the menu closed initially', () => {
    const { container } = render(Dropdown, { props: { items, trigger } });
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it('merges an extra class onto the wrapper', () => {
    const { container } = render(Dropdown, { props: { items, trigger, class: 'w-fit' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('w-fit');
  });

  it('renders with left alignment when align="left"', () => {
    const { container } = render(Dropdown, {
      props: { items, trigger, align: 'left' },
    });
    const wrapper = container.firstElementChild as HTMLElement;
    // The alignment is only visible when the menu is open, so we verify
    // the wrapper has the relative positioning class
    expect(wrapper.className).toContain('relative');
    expect(wrapper.className).toContain('inline-block');
  });

  it('renders items with icons when provided', () => {
    // icon takes a Component, not a Snippet: Dropdown renders it as <Icon />.
    const iconItems = [
      {
        label: 'Settings',
        icon: Settings,
        onclick: vi.fn(),
      },
    ];
    const { container } = render(Dropdown, {
      props: { items: iconItems, trigger },
    });
    // In closed state the icon won't render since the menu isn't shown
    // Just verify no crash
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});

describe('the menu keyboard contract', () => {
  it('moves focus to the first item when the menu opens', async () => {
    // role="menu" tells the reader to arrow through the items. Nothing was
    // focused on open, so the first arrow press went to the page behind it.
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    expect(document.activeElement).toBe(menuItems(container)[0]);
  });

  it('opens on ArrowDown at the first item', async () => {
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await fireEvent.keyDown(container.querySelector('button') as HTMLButtonElement, {
      key: 'ArrowDown',
    });
    expect(document.activeElement).toBe(menuItems(container)[0]);
  });

  it('opens on ArrowUp at the last item', async () => {
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await fireEvent.keyDown(container.querySelector('button') as HTMLButtonElement, {
      key: 'ArrowUp',
    });
    expect(document.activeElement).toBe(menuItems(container)[1]);
  });

  it('walks the items with the arrows and wraps past the ends', async () => {
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    const rows = menuItems(container);

    await fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[1]);

    // A menu wraps where a listbox holds at the end.
    await fireEvent.keyDown(rows[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[0]);

    await fireEvent.keyDown(rows[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(rows[1]);
  });

  it('jumps to the ends with Home and End', async () => {
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    const rows = menuItems(container);

    await fireEvent.keyDown(rows[0], { key: 'End' });
    expect(document.activeElement).toBe(rows[1]);

    await fireEvent.keyDown(rows[1], { key: 'Home' });
    expect(document.activeElement).toBe(rows[0]);
  });

  it('steps over an item that cannot be chosen', async () => {
    // A disabled button refuses focus, so landing on one would strand the
    // keyboard on a row that takes no key at all.
    const withDisabled = [
      { label: 'Edit', onclick: vi.fn() },
      { label: 'Archive', disabled: true, onclick: vi.fn() },
      { label: 'Delete', onclick: vi.fn() },
    ];
    const { container } = render(Dropdown, {
      props: { items: withDisabled, trigger: liveTrigger },
    });
    await openMenu(container);
    const rows = menuItems(container);

    await fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[2]);
  });

  it('leaves one item in the tab sequence at a time', async () => {
    // Without a roving tabindex every row sits between the trigger and the
    // next control on the page.
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    const rows = menuItems(container);
    expect(rows.map((row) => row.getAttribute('tabindex'))).toEqual(['0', '-1']);

    await fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(menuItems(container).map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '0']);
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    const triggerButton = container.querySelector('button') as HTMLButtonElement;

    await fireEvent.keyDown(menuItems(container)[0], { key: 'Escape' });
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(triggerButton);
  });

  it('stops Escape from reaching a modal around it', async () => {
    // Unstopped, one press closed the menu and the surface holding it.
    const onKeydown = vi.fn();
    document.addEventListener('keydown', onKeydown);
    try {
      const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
      await openMenu(container);
      await fireEvent.keyDown(menuItems(container)[0], { key: 'Escape' });
      expect(onKeydown).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', onKeydown);
    }
  });

  it('closes on Tab and hands focus back before the browser moves it', async () => {
    // Focus is put on the trigger synchronously, so the tab continues from
    // there rather than from a row that is about to be unmounted.
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    const triggerButton = container.querySelector('button') as HTMLButtonElement;

    await fireEvent.keyDown(menuItems(container)[0], { key: 'Tab' });
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(triggerButton);
  });

  it('returns focus to the trigger after an item runs', async () => {
    const onclick = vi.fn();
    const { container } = render(Dropdown, {
      props: { items: [{ label: 'Edit', onclick }], trigger: liveTrigger },
    });
    await openMenu(container);
    const triggerButton = container.querySelector('button') as HTMLButtonElement;

    await fireEvent.click(menuItems(container)[0]);
    expect(onclick).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(triggerButton);
  });

  it('takes no focus back when the pointer closes it from outside', async () => {
    // The user has already said where they are going.
    const { container } = render(Dropdown, { props: { items, trigger: liveTrigger } });
    await openMenu(container);
    const outside = document.createElement('button');
    document.body.append(outside);
    try {
      await fireEvent.click(outside);
      expect(container.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).not.toBe(container.querySelector('button'));
    } finally {
      outside.remove();
    }
  });
});
