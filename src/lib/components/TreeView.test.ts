import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TreeView from './TreeView.svelte';
import { CHOICE_MARK } from '../internal/choice.js';
import type { TreeNode } from '../internal/tree.js';

/**
 * A tree is the one widget where the keyboard contract is the component. Every
 * test here holds a behaviour a user loses silently when it breaks: a row the
 * arrows cannot reach, a hundred tab stops where there should be one, a branch
 * that reports a state its own click does not produce.
 */

const nodes: TreeNode[] = [
  {
    id: 'docs',
    label: 'Docs',
    children: [
      {
        id: 'guide',
        label: 'Guide',
        children: [
          { id: 'install', label: 'Install' },
          { id: 'usage', label: 'Usage' },
        ],
      },
      { id: 'api', label: 'API', badge: 3 },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    children: [
      { id: 'logo', label: 'Logo' },
      { id: 'draft', label: 'Draft', disabled: true },
    ],
  },
  { id: 'readme', label: 'Readme' },
];

/** A branch whose every leaf is disabled: the empty branch case. */
const locked: TreeNode[] = [
  {
    id: 'locked',
    label: 'Locked',
    children: [
      { id: 'a', label: 'A', disabled: true },
      { id: 'b', label: 'B', disabled: true },
    ],
  },
];

function row(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-tree-id="${id}"]`);
  expect(el, `no row for ${id}`).toBeTruthy();
  return el as HTMLElement;
}

const visible = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[role="treeitem"]'),
];

describe('TreeView structure', () => {
  it('names the tree, so it is not announced as just "tree"', () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    const tree = container.querySelector('[role="tree"]');
    expect(tree?.getAttribute('aria-label')).toBe('Files');
  });

  it('marks a branch expanded and leaves a leaf without the attribute', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'] },
    });
    expect(row(container, 'docs').getAttribute('aria-expanded')).toBe('true');
    expect(row(container, 'media').getAttribute('aria-expanded')).toBe('false');
    expect(row(container, 'readme').hasAttribute('aria-expanded')).toBe(false);
  });

  it('puts children in a role="group" inside their parent row', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'] },
    });
    const group = row(container, 'docs').querySelector('[role="group"]');
    expect(group).toBeTruthy();
    expect(group?.contains(row(container, 'api'))).toBe(true);
  });

  it('states aria-level, aria-setsize and aria-posinset correctly at depth 2', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'] },
    });
    const api = row(container, 'api');
    expect(api.getAttribute('aria-level')).toBe('2');
    expect(api.getAttribute('aria-setsize')).toBe('2');
    expect(api.getAttribute('aria-posinset')).toBe('2');

    const guide = row(container, 'guide');
    expect(guide.getAttribute('aria-level')).toBe('2');
    expect(guide.getAttribute('aria-posinset')).toBe('1');

    // The roots are the sibling set at level 1, not the whole flattened list.
    const docs = row(container, 'docs');
    expect(docs.getAttribute('aria-level')).toBe('1');
    expect(docs.getAttribute('aria-setsize')).toBe('3');
    expect(docs.getAttribute('aria-posinset')).toBe('1');
  });

  it('indents with a style attribute rather than an interpolated class', () => {
    // A class built from the depth matches no candidate in Tailwind's scan, so
    // no rule is generated and every row draws flush left.
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs', 'guide'] },
    });
    const content = row(container, 'install').firstElementChild as HTMLElement;
    expect(content.getAttribute('style')).toContain('var(--spacing-stack)');
    expect(content.className).not.toContain('[');
  });

  it('accepts a class from the consumer', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', class: 'w-64' },
    });
    expect(container.querySelector('[role="tree"]')?.className).toContain('w-64');
  });

  it('draws the badge beside the label', () => {
    const { container, getByText } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'] },
    });
    expect(getByText('3')).toBeTruthy();
    expect(row(container, 'api').textContent).toContain('API');
  });
});

describe('TreeView roving tabindex', () => {
  it('keeps exactly one tabbable row', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs', 'guide'] },
    });
    expect(visible(container).length).toBe(7);
    const tabbable = () => visible(container).filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]).toBe(row(container, 'docs'));
  });

  it('moves the one tab stop with the arrows', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    await fireEvent.keyDown(row(container, 'docs'), { key: 'ArrowDown' });
    const tabbable = visible(container).filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(row(container, 'media'));
  });

  it('starts on the selected row when there is one', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', selected: 'readme' },
    });
    expect(row(container, 'readme').getAttribute('tabindex')).toBe('0');
    expect(row(container, 'docs').getAttribute('tabindex')).toBe('-1');
  });
});

describe('TreeView keyboard', () => {
  it('ArrowDown skips the children of a collapsed branch', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    expect(container.querySelector('[data-tree-id="guide"]')).toBeNull();
    await fireEvent.keyDown(row(container, 'docs'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(row(container, 'media'));
  });

  it('ArrowDown walks into an expanded branch', async () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'] },
    });
    await fireEvent.keyDown(row(container, 'docs'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(row(container, 'guide'));
  });

  it('ArrowUp moves to the previous visible row and stops at the top', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    await fireEvent.keyDown(row(container, 'media'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(row(container, 'docs'));
    await fireEvent.keyDown(row(container, 'docs'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(row(container, 'docs'));
  });

  it('ArrowRight expands then descends', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    const docs = row(container, 'docs');
    docs.focus();

    await fireEvent.keyDown(docs, { key: 'ArrowRight' });
    expect(row(container, 'docs').getAttribute('aria-expanded')).toBe('true');
    // The first press leaves focus where it is, or the child is announced
    // before its parent has said it is now open.
    expect(document.activeElement).toBe(row(container, 'docs'));

    await fireEvent.keyDown(row(container, 'docs'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(row(container, 'guide'));
  });

  it('ArrowRight does nothing on a leaf', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    await fireEvent.keyDown(row(container, 'readme'), { key: 'ArrowRight' });
    expect(visible(container)).toHaveLength(3);
  });

  it('ArrowLeft collapses then ascends', async () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs', 'guide'] },
    });
    const guide = row(container, 'guide');
    guide.focus();

    await fireEvent.keyDown(guide, { key: 'ArrowLeft' });
    expect(row(container, 'guide').getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-tree-id="install"]')).toBeNull();
    expect(document.activeElement).toBe(row(container, 'guide'));

    await fireEvent.keyDown(row(container, 'guide'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(row(container, 'docs'));
  });

  it('Home and End go to the first and last visible rows', async () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['media'] },
    });
    await fireEvent.keyDown(row(container, 'media'), { key: 'End' });
    expect(document.activeElement).toBe(row(container, 'readme'));
    await fireEvent.keyDown(row(container, 'readme'), { key: 'Home' });
    expect(document.activeElement).toBe(row(container, 'docs'));
  });

  it('moves to a row whose label starts with what was typed', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    await fireEvent.keyDown(row(container, 'docs'), { key: 'r' });
    expect(document.activeElement).toBe(row(container, 'readme'));
  });

  it('keeps the typeahead buffer within its window', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    await fireEvent.keyDown(row(container, 'docs'), { key: 'm' });
    expect(document.activeElement).toBe(row(container, 'media'));
    // "me" still names Media, so the second key refines the search rather than
    // starting a new one and jumping off the row it just found.
    await fireEvent.keyDown(row(container, 'media'), { key: 'e' });
    expect(document.activeElement).toBe(row(container, 'media'));
  });
});

describe('TreeView activation', () => {
  it('Enter activates the row', async () => {
    const onactivate = vi.fn();
    const { container } = render(TreeView, { props: { nodes, label: 'Files', onactivate } });
    await fireEvent.keyDown(row(container, 'readme'), { key: 'Enter' });
    expect(onactivate).toHaveBeenCalledTimes(1);
    expect(onactivate.mock.calls[0][0].id).toBe('readme');
    expect(row(container, 'readme').getAttribute('aria-selected')).toBe('true');
  });

  it('Space activates when the tree is not checkable', async () => {
    const onactivate = vi.fn();
    const { container } = render(TreeView, { props: { nodes, label: 'Files', onactivate } });
    await fireEvent.keyDown(row(container, 'readme'), { key: ' ' });
    expect(onactivate).toHaveBeenCalledTimes(1);
  });

  it('Space toggles the check while Enter activates', async () => {
    const onactivate = vi.fn();
    const oncheck = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['media'], checkable: true, onactivate, oncheck },
    });

    // One key doing both is how a tree becomes unusable: the user can then
    // neither choose a row without writing it nor write it without choosing.
    await fireEvent.keyDown(row(container, 'logo'), { key: ' ' });
    expect(oncheck).toHaveBeenCalledWith(['logo']);
    expect(onactivate).not.toHaveBeenCalled();

    await fireEvent.keyDown(row(container, 'logo'), { key: 'Enter' });
    expect(onactivate).toHaveBeenCalledTimes(1);
    expect(oncheck).toHaveBeenCalledTimes(1);
  });

  it('opens a branch when its row is clicked', async () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    await fireEvent.click(row(container, 'docs').firstElementChild as HTMLElement);
    expect(row(container, 'docs').getAttribute('aria-expanded')).toBe('true');
  });

  it('answers only for a click on its own row', async () => {
    // Every row is nested inside its ancestors, so a click on a child bubbles
    // through all of them, and a parent that answers for it collapses itself.
    const onactivate = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'], onactivate },
    });
    await fireEvent.click(row(container, 'api').firstElementChild as HTMLElement);
    expect(onactivate).toHaveBeenCalledTimes(1);
    expect(onactivate.mock.calls[0][0].id).toBe('api');
    expect(row(container, 'docs').getAttribute('aria-expanded')).toBe('true');
  });

  it('does not activate a disabled row', async () => {
    const onactivate = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['media'], onactivate },
    });
    expect(row(container, 'draft').getAttribute('aria-disabled')).toBe('true');
    await fireEvent.keyDown(row(container, 'draft'), { key: 'Enter' });
    expect(onactivate).not.toHaveBeenCalled();
  });
});

describe('TreeView checking', () => {
  it('checking a branch writes every enabled leaf and skips the disabled one', async () => {
    const oncheck = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', checkable: true, oncheck },
    });
    const check = row(container, 'media').querySelector('[data-tree-check]') as HTMLElement;
    await fireEvent.click(check);
    expect(oncheck).toHaveBeenCalledWith(['logo']);
  });

  it('writes leaf ids only, so a branch cannot disagree with its own leaves', async () => {
    const oncheck = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', checkable: true, oncheck },
    });
    await fireEvent.click(row(container, 'docs').querySelector('[data-tree-check]') as HTMLElement);
    expect(oncheck).toHaveBeenCalledWith(['install', 'usage', 'api']);
  });

  it('reports mixed for a partial set', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['docs'], checkable: true, checked: ['api'] },
    });
    expect(row(container, 'docs').getAttribute('aria-checked')).toBe('mixed');
    expect(row(container, 'api').getAttribute('aria-checked')).toBe('true');
    expect(row(container, 'guide').getAttribute('aria-checked')).toBe('false');
  });

  it('reaches all without the disabled leaf', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', checkable: true, checked: ['logo'] },
    });
    expect(row(container, 'media').getAttribute('aria-checked')).toBe('true');
  });

  it('draws the mixed mark as an SVG path rather than a character', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', checkable: true, checked: ['api'] },
    });
    const mark = row(container, 'docs').querySelector('[data-tree-check] path');
    expect(mark?.getAttribute('d')).toBe(CHOICE_MARK.mixed);
    // A font glyph standing in for the bar lands at whatever weight the
    // reader's font gives it, visibly apart from every other icon in the kit.
    expect(row(container, 'docs').textContent).not.toMatch(/[×−✓]/);
  });

  it('draws the check mark for a fully checked branch', () => {
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', checkable: true, checked: ['install', 'usage', 'api'] },
    });
    const mark = row(container, 'docs').querySelector('[data-tree-check] path');
    expect(mark?.getAttribute('d')).toBe(CHOICE_MARK.check);
  });

  it('reports none for the empty branch case and writes nothing on the next click', async () => {
    // Array.every is true over an empty array, so a branch with no enabled
    // leaves draws as fully checked, and the click that follows is a bulk write
    // nobody asked for.
    const oncheck = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes: locked, label: 'Files', checkable: true, oncheck },
    });
    const lockedRow = row(container, 'locked');
    expect(lockedRow.getAttribute('aria-checked')).toBe('false');
    expect(lockedRow.querySelector('[data-tree-check] path')).toBeNull();

    await fireEvent.click(lockedRow.querySelector('[data-tree-check]') as HTMLElement);
    expect(oncheck).not.toHaveBeenCalled();
    expect(row(container, 'locked').getAttribute('aria-checked')).toBe('false');
  });

  it('does not check a disabled row', async () => {
    const oncheck = vi.fn();
    const { container } = render(TreeView, {
      props: { nodes, label: 'Files', expanded: ['media'], checkable: true, oncheck },
    });
    await fireEvent.keyDown(row(container, 'draft'), { key: ' ' });
    expect(oncheck).not.toHaveBeenCalled();
  });

  it('carries no aria-checked when the tree is not checkable', () => {
    const { container } = render(TreeView, { props: { nodes, label: 'Files' } });
    expect(row(container, 'docs').hasAttribute('aria-checked')).toBe(false);
  });
});
