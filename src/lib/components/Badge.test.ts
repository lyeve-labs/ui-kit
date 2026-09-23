import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Badge', () => {
  it('renders its children', () => {
    const { getByText } = render(Badge, { props: { children: text('NEW') } });
    expect(getByText('NEW')).toBeTruthy();
  });

  it('applies the neutral tone class by default', () => {
    const { container } = render(Badge, { props: { children: text('x') } });
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-surface-2');
  });

  it('applies the brand tone class', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'brand' } });
    expect(container.querySelector('.text-brand')).toBeTruthy();
  });

  it('applies the violet tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'violet' } });
    expect(container.querySelector('.text-violet')).toBeTruthy();
  });

  it('applies the success tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'success' } });
    expect(container.querySelector('.text-success')).toBeTruthy();
  });

  it('applies the warn tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'warn' } });
    expect(container.querySelector('.text-warn')).toBeTruthy();
  });

  it('applies the danger tone', () => {
    const { container } = render(Badge, { props: { children: text('x'), tone: 'danger' } });
    expect(container.querySelector('.text-danger')).toBeTruthy();
  });

  it('applies sm size class by default', () => {
    const { container } = render(Badge, { props: { children: text('x') } });
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('text-xs');
  });

  it('applies md size class when size="md"', () => {
    const { container } = render(Badge, { props: { children: text('x'), size: 'md' } });
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('text-sm');
  });

  it('renders a dot with matching tone color', () => {
    const { container } = render(Badge, {
      props: { children: text('x'), tone: 'success', dot: true },
    });
    expect(container.querySelector('.bg-success')).toBeTruthy();
    expect(container.querySelector('.w-1\\.5')).toBeTruthy();
  });

  it('renders danger dot with correct color', () => {
    const { container } = render(Badge, {
      props: { children: text('x'), tone: 'danger', dot: true },
    });
    expect(container.querySelector('.bg-danger')).toBeTruthy();
  });

  it('does not render a dot by default', () => {
    const { container } = render(Badge, { props: { children: text('x') } });
    expect(container.querySelector('.w-1\\.5')).toBeNull();
  });
});

describe('Badge in a narrow cell', () => {
  it('never breaks its label inside itself', () => {
    // Under a Table's default `overflow-wrap: anywhere` a status rendered as
    // `dra ft` and a role as `sup er_a dmi n`; 156 admin cells opted out of
    // wrapping to stop it, one cell at a time.
    const { container } = render(Badge, { props: { children: text('draft') } });
    const list = (container.firstElementChild as HTMLElement).className.split(/\s+/);
    expect(list).toContain('whitespace-nowrap');
    expect(list).toContain('max-w-full');
  });

  it('truncates rather than overflowing when the caller caps its width', () => {
    // text-overflow does not reach into a flex item, so the label sits in a
    // span of its own that can shrink and end in an ellipsis.
    const { container, getByText } = render(Badge, {
      props: { class: 'max-w-24', children: text('a-very-long-status-name') },
    });
    const label = getByText('a-very-long-status-name').parentElement as HTMLElement;
    expect(label.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-w-0', 'truncate']));
    expect(container.firstElementChild?.contains(label)).toBe(true);
  });
});

describe('an icon in the label', () => {
  /**
   * Preflight makes every svg a block, and a block inside the label takes a
   * line of its own. A badge with an icon rendered two rows tall inside a
   * pill, with the icon stacked above its own text.
   */
  it('sits on the line with its text rather than above it', () => {
    const { container } = render(Badge, { props: { children: text('Stored') } });
    const label = container.querySelector('span > span.truncate');
    expect(label?.className).toContain('[&>svg]:inline');
    expect(label?.className).toContain('[&>svg]:align-middle');
  });

  it('keeps the ellipsis the label span exists for', () => {
    // A flex row would fix the stacking and lose this.
    const { container } = render(Badge, { props: { children: text('Stored') } });
    const label = container.querySelector('span > span.truncate');
    expect(label?.className).toContain('truncate');
    expect(label?.className).not.toContain('flex');
  });
});
