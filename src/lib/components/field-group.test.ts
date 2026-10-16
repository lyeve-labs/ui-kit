import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GroupFields from '../../../tests/fixtures/GroupFields.svelte';

/**
 * How many elements outside sr-only draw exactly this text as their own, of
 * any tag, so a caption moved into a div or a heading is still counted.
 */
function drawn(root: HTMLElement, text: string): number {
  return [...root.querySelectorAll<HTMLElement>('*')].filter((el) => {
    const own = [...el.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    return own === text && !el.closest('.sr-only');
  }).length;
}

/**
 * Field's notes promised every group control its name through labeledBy, and
 * only SegmentedControl takes it. These render each control through the wiring
 * a group Field hands over, as a consumer would, and read what a screen reader
 * announces against what the screen draws.
 */
describe('a group Field around a group control', () => {
  it('names a SegmentedControl by the caption drawn above it, drawn once', () => {
    const { container } = render(GroupFields);
    const group = screen.getByRole('radiogroup', { name: 'Window' });
    const caption = document.getElementById(group.getAttribute('aria-labelledby') ?? '');
    expect(caption?.textContent?.trim()).toBe('Window');
    expect(group.hasAttribute('aria-label')).toBe(false);
    expect(drawn(container, 'Window')).toBe(1);
    const hint = screen.getByText('Charts cover this window.');
    expect(group.getAttribute('aria-describedby')?.split(' ')).toContain(hint.id);
  });

  it('names FilterChips by its own label, which carries the caption words', () => {
    const { container } = render(GroupFields);
    const group = screen.getByRole('group', { name: 'Import from' });
    expect(drawn(container, 'Import from')).toBe(1);
    const hint = screen.getByText('One source per run.');
    expect(group.getAttribute('aria-describedby')?.split(' ')).toContain(hint.id);
  });
});
