import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Alert from './Alert.svelte';

const text = (s: string) =>
  createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Alert', () => {
  it('renders children with role="alert"', () => {
    const { container, getByText } = render(Alert, { props: { children: text('Heads up') } });
    expect(getByText('Heads up')).toBeTruthy();
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('renders the title', () => {
    const { getByText } = render(Alert, {
      props: { children: text('body'), title: 'Notice' },
    });
    expect(getByText('Notice')).toBeTruthy();
  });

  it('applies the tone wrapper class and mark for danger', () => {
    const { container, getByText } = render(Alert, {
      props: { children: text('x'), tone: 'danger' },
    });
    expect(container.querySelector('[role="alert"]')?.className).toContain('bg-danger/8');
    expect(getByText('×')).toBeTruthy();
  });

  it('defaults to the info tone', () => {
    const { container } = render(Alert, { props: { children: text('x') } });
    expect(container.querySelector('[role="alert"]')?.className).toContain('bg-brand/8');
  });

  it('fires ondismiss when the dismiss button is clicked', async () => {
    const ondismiss = vi.fn();
    const { getByLabelText } = render(Alert, {
      props: { children: text('x'), dismissible: true, ondismiss },
    });
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('has no dismiss button unless dismissible', () => {
    const { queryByLabelText } = render(Alert, { props: { children: text('x') } });
    expect(queryByLabelText('Dismiss')).toBeNull();
  });
});
