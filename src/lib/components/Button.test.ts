import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Button', () => {
  it('renders its children', () => {
    const { getByText } = render(Button, { props: { children: text('Save') } });
    expect(getByText('Save')).toBeTruthy();
  });

  it('renders a <button> with type="button" by default', () => {
    const { container } = render(Button, { props: { children: text('x') } });
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('type')).toBe('button');
  });

  it('applies the primary variant class by default', () => {
    const { container } = render(Button, { props: { children: text('x') } });
    expect(container.querySelector('button')?.className).toContain('bg-brand');
  });

  it('applies the danger variant class', () => {
    const { container } = render(Button, {
      props: { children: text('x'), variant: 'danger' },
    });
    expect(container.querySelector('button')?.className).toContain('bg-danger');
  });

  it('applies the secondary variant class', () => {
    const { container } = render(Button, {
      props: { children: text('x'), variant: 'secondary' },
    });
    expect(container.querySelector('button')?.className).toContain('bg-surface-2');
  });

  it('applies the lg size class', () => {
    const { container } = render(Button, {
      props: { children: text('x'), size: 'lg' },
    });
    expect(container.querySelector('button')?.className).toContain('text-base');
  });

  it('applies w-full when full=true', () => {
    const { container } = render(Button, {
      props: { children: text('x'), full: true },
    });
    expect(container.querySelector('button')?.className).toContain('w-full');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Button, {
      props: { children: text('x'), disabled: true },
    });
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled and shows a spinner when loading=true', () => {
    const { container } = render(Button, {
      props: { children: text('x'), loading: true },
    });
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('fires onclick when clicked', async () => {
    const onclick = vi.fn();
    const { container } = render(Button, { props: { children: text('x'), onclick } });
    await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('renders an anchor instead of a button when href is set', () => {
    const { container } = render(Button, {
      props: { children: text('x'), href: '/go' },
    });
    expect(container.querySelector('button')).toBeNull();
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('/go');
  });

  it('does not navigate when a link button is disabled', () => {
    // `disabled` is not an anchor attribute and `disabled:opacity-50` never
    // matches an <a>, so the prop was accepted and dropped: the link rendered
    // ordinary and followed on click. Removing href is what actually stops it.
    const { container } = render(Button, {
      props: { href: '/somewhere', disabled: true, children: text('Go') },
    });
    const a = container.querySelector('a') as HTMLAnchorElement;
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('does not navigate while a link button is loading', () => {
    const { container } = render(Button, {
      props: { href: '/somewhere', loading: true, children: text('Go') },
    });
    const a = container.querySelector('a') as HTMLAnchorElement;
    expect(a.hasAttribute('href')).toBe(false);
  });

  it('reports a submit in flight to assistive technology', () => {
    const { container } = render(Button, { props: { loading: true, children: text('Save') } });
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
  });
});
