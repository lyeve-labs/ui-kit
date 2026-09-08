import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Logo from './Logo.svelte';

describe('Logo', () => {
  it('renders the mark and the wordmark by default', () => {
    const { container, getByText } = render(Logo);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(getByText('LyEve')).toBeTruthy();
  });

  it('renders the mark alone when the wordmark is off', () => {
    const { container, queryByText } = render(Logo, { props: { wordmark: false } });
    expect(container.querySelector('svg')).toBeTruthy();
    expect(queryByText('LyEve')).toBeNull();
  });

  it.each([
    ['sm', 24],
    ['md', 28],
    ['lg', 36],
  ] as const)('sizes the %s mark to a %ipx box', (size, px) => {
    const { container } = render(Logo, { props: { size } });
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe(String(px));
    expect(svg.getAttribute('height')).toBe(String(px));
  });

  it('passes a class through to the root', () => {
    const { container } = render(Logo, { props: { class: 'h-8' } });
    expect((container.firstElementChild as HTMLElement).className).toContain('h-8');
  });

  it('hides the mark from assistive technology', () => {
    const { container } = render(Logo);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  /*
   * The two application copies this replaces painted hex behind a
   * prefers-color-scheme query, so the mark answered the operating system while
   * every other pixel answered data-theme. scripts/check-ui-cross-repo.sh gates
   * that estate-wide; pinning it here catches a reintroduction at the source
   * rather than one release later.
   */
  it('paints every face from a token rather than hex', () => {
    const { container } = render(Logo);
    expect(container.querySelector('.fill-current')).toBeTruthy();
    expect(container.querySelector('.fill-brand')).toBeTruthy();
    const faces = [...container.querySelectorAll('polygon')];
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face.getAttribute('fill')).toBeNull();
      expect(face.getAttribute('style')).toBeNull();
    }
  });
});
