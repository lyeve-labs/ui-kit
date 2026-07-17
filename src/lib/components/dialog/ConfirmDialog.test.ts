import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DialogEntry } from './types.js';
import ConfirmDialog from './ConfirmDialog.svelte';

const mockCloseDialog = vi.fn();
const mockDismissDialog = vi.fn();

vi.mock('./dialog-manager.svelte', () => ({
  closeDialog: (...args: unknown[]) => mockCloseDialog(...args),
  dismissDialog: (...args: unknown[]) => mockDismissDialog(...args),
}));

function makeEntry(overrides: Partial<DialogEntry<boolean>> = {}): DialogEntry<boolean> {
  return {
    id: 'confirm-test',
    options: { id: 'confirm-test' },
    resolve: vi.fn(),
    reject: vi.fn(),
    depth: 0,
    meta: {},
    ...overrides,
  };
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a warning icon', () => {
    const entry = makeEntry();
    const { container } = render(ConfirmDialog, { props: { entry } });
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders the confirm title from meta', () => {
    const entry = makeEntry({ meta: { confirmTitle: 'Delete Item?' } });
    const { getByText } = render(ConfirmDialog, { props: { entry } });
    expect(getByText('Delete Item?')).toBeTruthy();
  });

  it('falls back to "Confirm" as title text when no title in meta', () => {
    const entry = makeEntry();
    const { container } = render(ConfirmDialog, { props: { entry } });
    // The title <p> uses a specific class; check it directly
    const titleEl = container.querySelector('p.text-sm.text-fg');
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent).toBe('Confirm');
  });

  it('renders the confirm message when provided in meta', () => {
    const entry = makeEntry({ meta: { confirmTitle: 'T', confirmMessage: 'Are you sure?' } });
    const { getByText } = render(ConfirmDialog, { props: { entry } });
    expect(getByText('Are you sure?')).toBeTruthy();
  });

  it('does not add a message paragraph when confirmMessage is empty', () => {
    const entry = makeEntry({ meta: { confirmTitle: 'T', confirmMessage: '' } });
    const { container } = render(ConfirmDialog, { props: { entry } });
    // Only the title <p> should exist; no message <p>
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(1);
  });

  it('renders a Cancel button', () => {
    const entry = makeEntry();
    const { getByText } = render(ConfirmDialog, { props: { entry } });
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('renders a Confirm button with danger variant', () => {
    const entry = makeEntry();
    const { container } = render(ConfirmDialog, { props: { entry } });
    // The confirm button should have a danger background class
    const buttons = container.querySelectorAll('button');
    const confirmBtn = Array.from(buttons).find((b) => b.textContent?.includes('Confirm'));
    expect(confirmBtn).toBeTruthy();
    expect((confirmBtn as HTMLElement).className).toContain('bg-danger');
  });

  it('uses custom button labels from meta', () => {
    const entry = makeEntry({
      meta: { confirmTitle: 'T', confirmLabel: 'Yes', cancelLabel: 'No' },
    });
    const { getByText } = render(ConfirmDialog, { props: { entry } });
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();
  });
});
