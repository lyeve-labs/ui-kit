import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Banner from './Banner.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Banner', () => {
  it('renders children with role="status"', () => {
    const { container, getByText } = render(Banner, {
      props: { children: text('Maintenance tonight') },
    });
    expect(getByText('Maintenance tonight')).toBeTruthy();
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('applies the tone class', () => {
    const { container } = render(Banner, {
      props: { children: text('x'), tone: 'success' },
    });
    expect(container.querySelector('[role="status"]')?.className).toContain('bg-success/10');
  });

  it('renders an action snippet', () => {
    const { getByText } = render(Banner, {
      props: { children: text('x'), action: text('Undo') },
    });
    expect(getByText('Undo')).toBeTruthy();
  });

  it('dismisses (unmounts) and fires ondismiss when clicked', async () => {
    const ondismiss = vi.fn();
    const { container, getByLabelText } = render(Banner, {
      props: { children: text('x'), dismissible: true, ondismiss },
    });
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(ondismiss).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
