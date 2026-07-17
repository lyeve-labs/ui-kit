import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { DialogEntry } from './types';
import Dialog from './Dialog.svelte';

// Mock dialog-manager for lifecycle assertions
const mockLockBodyScroll = vi.fn();
const mockUnlockBodyScroll = vi.fn();

vi.mock('./dialog-manager.svelte', () => ({
  _lockBodyScroll: () => mockLockBodyScroll(),
  _unlockBodyScroll: () => mockUnlockBodyScroll(),
  closeDialog: vi.fn(),
  dismissDialog: vi.fn(),
}));

function makeEntry(overrides: Partial<DialogEntry> = {}): DialogEntry {
  return {
    id: 'test-dialog',
    options: { id: 'test-dialog' },
    resolve: vi.fn(),
    reject: vi.fn(),
    depth: 0,
    ...overrides,
  };
}

describe('Dialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────

  it('renders a dialog with role="dialog" and aria-modal', () => {
    const entry = makeEntry();
    const { container } = render(Dialog, { props: { entry } });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('renders the title when provided as a string', () => {
    const entry = makeEntry({ options: { id: 't', title: 'Delete Item' } });
    const { getByText } = render(Dialog, { props: { entry } });
    expect(getByText('Delete Item')).toBeTruthy();
  });

  it('renders the close button for non-persistent dialogs', () => {
    const entry = makeEntry();
    const { container } = render(Dialog, { props: { entry } });
    const closeBtn = container.querySelector('button[aria-label="Close"]');
    expect(closeBtn).toBeTruthy();
  });

  it('does not render the close button for persistent dialogs', () => {
    const entry = makeEntry({ options: { id: 'p', persistent: true } });
    const { container } = render(Dialog, { props: { entry } });
    expect(container.querySelector('button[aria-label="Close"]')).toBeNull();
  });

  it('renders the body snippet when provided', () => {
    const entry = makeEntry({
      options: {
        id: 'b',
        body: createRawSnippet(() => ({ render: () => '<p>Body text</p>' })),
      },
    });
    const { getByText } = render(Dialog, { props: { entry } });
    expect(getByText('Body text')).toBeTruthy();
  });

  it('renders children snippet when no body option', () => {
    const entry = makeEntry();
    const children = createRawSnippet(() => ({ render: () => '<span>child</span>' }));
    const { getByText } = render(Dialog, { props: { entry, children } });
    expect(getByText('child')).toBeTruthy();
  });

  it('renders the footer when provided', () => {
    const entry = makeEntry({
      options: {
        id: 'f',
        footer: createRawSnippet(() => ({ render: () => '<button>OK</button>' })),
      },
    });
    const { getByText } = render(Dialog, { props: { entry } });
    expect(getByText('OK')).toBeTruthy();
  });

  // ── ARIA label ─────────────────────────────────────────

  it('uses the string title as aria-label', () => {
    const entry = makeEntry({ options: { id: 'a', title: 'Settings' } });
    const { container } = render(Dialog, { props: { entry } });
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Settings',
    );
  });

  it('falls back to "Dialog" aria-label when title is missing', () => {
    const entry = makeEntry();
    const { container } = render(Dialog, { props: { entry } });
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Dialog');
  });

  // ── Lifecycle (onMount) ────────────────────────────────

  it('locks body scroll on mount and unlocks on destroy', () => {
    const entry = makeEntry();
    const { unmount } = render(Dialog, { props: { entry } });
    expect(mockLockBodyScroll).toHaveBeenCalled();
    unmount();
    expect(mockUnlockBodyScroll).toHaveBeenCalled();
  });

  // ── Stacking (depth) ───────────────────────────────────

  it('applies higher z-index for deeper dialogs', () => {
    const entry = makeEntry({ depth: 3 });
    const { container } = render(Dialog, { props: { entry } });
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain('z-[53]');
  });

  it('applies default z-index at depth 0', () => {
    const entry = makeEntry({ depth: 0 });
    const { container } = render(Dialog, { props: { entry } });
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain('z-[50]');
  });

  // ── Title Snippet ──────────────────────────────────────

  it('renders a title snippet when provided', () => {
    const entry = makeEntry({
      options: {
        id: 'ts',
        title: createRawSnippet(() => ({ render: () => '<em>Custom Title</em>' })),
      },
    });
    const { container } = render(Dialog, { props: { entry } });
    expect(container.querySelector('em')).toBeTruthy();
  });
});
