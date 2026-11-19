import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Skeleton from './Skeleton.svelte';

describe('Skeleton', () => {
  it('renders a pulsing placeholder', () => {
    const { container } = render(Skeleton, { props: {} });
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('rounded-md');
  });

  it('applies width and height styles', () => {
    const { container } = render(Skeleton, { props: { width: '200px', height: '2rem' } });
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('2rem');
  });

  it('honors a custom rounded class', () => {
    const { container } = render(Skeleton, { props: { rounded: 'rounded-full' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('rounded-full');
  });

  it('says nothing and draws one hidden block without a label', () => {
    const { container } = render(Skeleton, { props: {} });
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toBe('');
  });

  it('names the wait to a screen reader with a label', () => {
    render(Skeleton, { props: { label: 'Loading webhooks' } });
    const words = screen.getByText('Loading webhooks');
    expect(words.className).toBe('sr-only');
    expect(words.closest('[aria-hidden="true"]')).toBeNull();
    expect(words.closest('[role]')).toBeNull();
  });

  it('stays one element with a label, so a stack spaces it as one child', () => {
    const { container } = render(Skeleton, {
      props: { label: 'Loading webhooks', width: '200px', rounded: 'rounded-full' },
    });
    expect(container.children).toHaveLength(1);
    // Svelte's anchors are comments and empty text, which draw nothing. A
    // space between two elements would.
    const drawn = [...container.childNodes].filter(
      (n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent),
    );
    expect(drawn).toHaveLength(1);
    const block = container.firstElementChild as HTMLElement;
    expect(block.className).toContain('animate-pulse');
    expect(block.className).toContain('rounded-full');
    expect(block.style.width).toBe('200px');
    expect(block.textContent).toBe('Loading webhooks');
  });
});
