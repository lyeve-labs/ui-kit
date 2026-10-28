import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import type { MoveCheck } from '../internal/reorder.js';
import SortableList from './SortableList.svelte';

afterEach(cleanup);

type Row = { id: string; label: string };

const ROWS: Row[] = ['Hero', 'Features', 'Pricing', 'Footer'].map((label) => ({
  id: label.toLowerCase(),
  label,
}));

const plain = createRawSnippet((item: () => Row) => ({
  render: () => `<span>${item().label}</span>`,
}));

const titled = createRawSnippet((item: () => Row) => ({
  render: () => `<input aria-label="${item().label} title" value="${item().label}" />`,
}));

/** Two frames, which a landed move waits before it speaks. */
const frames = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/** The live region every move is announced through. */
const region = (container: HTMLElement) => container.querySelector('[aria-live]') as HTMLElement;

function setup(
  props: Partial<{
    row: typeof plain;
    canMove: (item: Row, from: number, to: number) => MoveCheck;
  }> = {},
) {
  const onmove = vi.fn();
  const result = render(SortableList<Row>, {
    props: { items: ROWS.slice(), label: 'Sections', row: plain, onmove, ...props },
  });
  return {
    ...result,
    onmove,
    order: () => [...result.container.querySelectorAll('li')].map((li) => li.textContent?.trim()),
    handle: (name: string) => result.getByRole('button', { name: `Move ${name}` }),
    status: () => region(result.container).textContent?.trim(),
  };
}

const alt = (key: 'ArrowUp' | 'ArrowDown', extra: Partial<KeyboardEventInit> = {}) => ({
  key,
  altKey: true,
  ...extra,
});

describe('SortableList', () => {
  it('names the list and every handle by its row', () => {
    const { getByRole, handle } = setup();
    expect(getByRole('list', { name: 'Sections' })).toBeTruthy();
    for (const row of ROWS) expect(handle(row.label)).toBeTruthy();
  });

  it('tells a screen reader the keys that move a row', () => {
    const { handle, container } = setup();
    const how = container.querySelector(`#${handle('Hero').getAttribute('aria-describedby')}`);
    expect(how?.textContent).toBe(
      'Press Alt with the up or down arrow to move a row, or Enter for a menu.',
    );
  });

  it('moves a row down on Alt+ArrowDown, says where it landed and reports the move', async () => {
    const { handle, order, status, onmove } = setup();
    await fireEvent.keyDown(handle('Hero'), alt('ArrowDown'));
    expect(order()).toEqual(['Features', 'Hero', 'Pricing', 'Footer']);
    await frames();
    expect(status()).toBe('Hero moved to position 2 of 4.');
    expect(onmove).toHaveBeenCalledOnce();
    expect(onmove.mock.calls[0][0]).toMatchObject({ from: 0, to: 1, item: { id: 'hero' } });
    expect(onmove.mock.calls[0][0].items.map((r: Row) => r.id)).toEqual([
      'features',
      'hero',
      'pricing',
      'footer',
    ]);
  });

  it('moves a row up on Alt+ArrowUp and keeps the focus on its handle', async () => {
    const { handle, order, status } = setup();
    handle('Pricing').focus();
    await fireEvent.keyDown(handle('Pricing'), alt('ArrowUp'));
    await frames();
    expect(order()).toEqual(['Hero', 'Pricing', 'Features', 'Footer']);
    expect(status()).toBe('Pricing moved to position 2 of 4.');
    expect(document.activeElement).toBe(handle('Pricing'));
  });

  it('says a row is already first or last and moves nothing', async () => {
    const { handle, order, status, onmove } = setup();
    await fireEvent.keyDown(handle('Hero'), alt('ArrowUp'));
    expect(status()).toBe('Hero is already first.');
    await fireEvent.keyDown(handle('Footer'), alt('ArrowDown'));
    expect(status()).toBe('Footer is already last.');
    expect(order()).toEqual(ROWS.map((r) => r.label));
    expect(onmove).not.toHaveBeenCalled();
  });

  it('speaks a repeated sentence again from a node of its own', async () => {
    const { handle, container } = setup();
    await fireEvent.keyDown(handle('Hero'), alt('ArrowUp'));
    const first = region(container).firstElementChild;
    await fireEvent.keyDown(handle('Hero'), alt('ArrowUp'));
    const second = region(container).firstElementChild;
    expect(second?.textContent).toBe(first?.textContent);
    expect(second).not.toBe(first);
  });

  it('says a landed move only after the focus has returned to its handle', async () => {
    // Firefox reports the restored focus as a new one, and Orca drops a polite
    // sentence still waiting when that focus arrives.
    const { handle, status } = setup();
    handle('Hero').focus();
    await fireEvent.keyDown(handle('Hero'), alt('ArrowDown'));
    await tick();
    expect(document.activeElement).toBe(handle('Hero'));
    expect(status()).toBe('');
    await frames();
    expect(status()).toBe('Hero moved to position 2 of 4.');
  });

  it('announces through a polite div that carries no status role', () => {
    // Browsers expose role="status" as a status bar, and Orca speaks nothing
    // inserted into one. Firefox exposes a paragraph as a paragraph, and Orca
    // drops its text when the list's own events come just before it.
    const live = region(setup().container);
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.hasAttribute('role')).toBe(false);
    expect(live.tagName).toBe('DIV');
  });

  it("announces the check's refusal and moves nothing", async () => {
    const canMove = (item: Row) => (item.id === 'footer' ? 'The footer stays last.' : true);
    const { handle, order, status, onmove } = setup({ canMove });
    await fireEvent.keyDown(handle('Footer'), alt('ArrowUp'));
    expect(status()).toBe('The footer stays last.');
    expect(order()).toEqual(ROWS.map((r) => r.label));
    expect(onmove).not.toHaveBeenCalled();
  });

  it('moves the row whose control holds the focus, unless that control takes text', async () => {
    const { getByLabelText, container, handle } = setup({ row: titled });
    const order = () =>
      [...container.querySelectorAll('li input')].map((i) => (i as HTMLInputElement).value);
    // Option and an arrow move the caret on macOS, so a text field keeps them.
    const untouched = await fireEvent.keyDown(getByLabelText('Pricing title'), alt('ArrowUp'));
    expect(untouched).toBe(true);
    expect(order()).toEqual(['Hero', 'Features', 'Pricing', 'Footer']);
    await fireEvent.keyDown(handle('Pricing'), alt('ArrowUp'));
    expect(order()).toEqual(['Hero', 'Pricing', 'Features', 'Footer']);
  });

  it('moves nothing on an arrow without Alt, or with another modifier beside it', async () => {
    const { handle, order, onmove, queryByRole } = setup();
    for (const init of [
      { key: 'ArrowDown' },
      alt('ArrowDown', { shiftKey: true }),
      alt('ArrowDown', { ctrlKey: true }),
      alt('ArrowDown', { metaKey: true }),
    ]) {
      await fireEvent.keyDown(handle('Hero'), init);
      // The handle is a menu button, so the arrow opens its menu instead.
      expect(queryByRole('menu')).not.toBeNull();
      await fireEvent.keyDown(queryByRole('menu')!, { key: 'Escape' });
    }
    expect(order()).toEqual(ROWS.map((r) => r.label));
    expect(onmove).not.toHaveBeenCalled();
  });

  it('leaves Alt and an arrow to a control in the row that has already taken them', async () => {
    const menu = createRawSnippet((item: () => Row) => ({
      render: () => `<button>${item().label} actions</button>`,
      setup: (node: Element) => {
        node.addEventListener('keydown', (e) => e.preventDefault());
      },
    }));
    const { getByRole, order, onmove } = setup({ row: menu });
    await fireEvent.keyDown(getByRole('button', { name: 'Pricing actions' }), alt('ArrowUp'));
    expect(order()).toEqual(ROWS.map((r) => `${r.label} actions`));
    expect(onmove).not.toHaveBeenCalled();
  });

  it("moves a row from its handle's menu, which offers no move past either end", async () => {
    const { handle, getByRole, order, status, onmove } = setup();
    await fireEvent.click(handle('Hero'));
    const up = getByRole('menuitem', { name: 'Move up' }) as HTMLButtonElement;
    expect(up.disabled).toBe(true);
    await fireEvent.click(getByRole('menuitem', { name: 'Move down' }));
    await frames();
    expect(order()).toEqual(['Features', 'Hero', 'Pricing', 'Footer']);
    expect(status()).toBe('Hero moved to position 2 of 4.');
    expect(onmove).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(handle('Hero'));
    await fireEvent.click(handle('Footer'));
    expect((getByRole('menuitem', { name: 'Move down' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("announces the check's refusal from the menu too", async () => {
    const canMove = (item: Row) => (item.id === 'footer' ? 'The footer stays last.' : true);
    const { handle, getByRole, order, status } = setup({ canMove });
    await fireEvent.click(handle('Footer'));
    await fireEvent.click(getByRole('menuitem', { name: 'Move up' }));
    expect(status()).toBe('The footer stays last.');
    expect(order()).toEqual(ROWS.map((r) => r.label));
  });
});
