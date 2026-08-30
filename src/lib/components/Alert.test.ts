import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Alert from './Alert.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

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

  it('applies the tone wrapper class and glyph for danger', () => {
    const { container } = render(Alert, {
      props: { children: text('x'), tone: 'danger' },
    });
    expect(container.querySelector('[role="alert"]')?.className).toContain('bg-danger/8');
    expect(container.querySelector('svg path')?.getAttribute('d')).toBe('M18 6L6 18M6 6l12 12');
  });

  it('defaults to the brand tone', () => {
    const { container } = render(Alert, { props: { children: text('x') } });
    expect(container.querySelector('[role="alert"]')?.className).toContain('bg-brand/8');
  });

  it('still accepts the retained "info" spelling of the brand tone', () => {
    const { container } = render(Alert, { props: { children: text('x'), tone: 'info' } });
    expect(container.querySelector('[role="alert"]')?.className).toContain('bg-brand/8');
  });

  it('carries a neutral tone, matching Banner', () => {
    const { container } = render(Alert, { props: { children: text('x'), tone: 'neutral' } });
    expect(container.querySelector('[role="alert"]')?.className).toContain('bg-surface-2');
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
