import { render } from '@testing-library/svelte';
import { describe, expect, it, vi, afterEach } from 'vitest';
import DialogContainer from './DialogContainer.svelte';
import { openDialog, closeDialog, dismissAllDialogs, getDialogStack } from './dialog-manager.svelte';

describe('DialogContainer', () => {
  afterEach(() => {
    dismissAllDialogs();
  });

  it('renders nothing visible when the stack is empty', () => {
    const { container } = render(DialogContainer);
    // Svelte emits a comment node for empty #each blocks
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders a dialog when one is pushed onto the stack', () => {
    openDialog({ id: 'dc1', title: 'Test Dialog' });
    const { container } = render(DialogContainer);
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe('Test Dialog');
    closeDialog(undefined, 'dc1');
  });

  it('renders multiple stacked dialogs', () => {
    openDialog({ id: 'bottom', title: 'Bottom' });
    openDialog({ id: 'top', title: 'Top' });
    const { container } = render(DialogContainer);
    const dialogs = container.querySelectorAll('[role="dialog"]');
    // Both should be present; the topmost renders last
    expect(dialogs.length).toBe(2);
    dismissAllDialogs();
  });
});
