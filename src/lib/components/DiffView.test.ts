import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import DiffView, { type DiffChange } from './DiffView.svelte';

afterEach(cleanup);

const rows = (container: HTMLElement) => [...container.querySelectorAll('li')];

describe('DiffView', () => {
  it('says two versions are the same when nothing changed', () => {
    const { container } = render(DiffView, { props: { changes: [] } });
    expect(container.textContent?.trim()).toBe('These versions are the same.');
    expect(container.querySelector('li')).toBeNull();
  });

  it('names each kind of change in words, never in color alone', () => {
    const changes: DiffChange[] = [
      { kind: 'added', label: 'Subtitle', value: 'Light shoes for long days.' },
      { kind: 'removed', label: 'Banner', value: 'Spring sale' },
      { kind: 'changed', label: 'Title', before: 'Run far', after: 'Run further' },
      { kind: 'moved', label: 'Pricing', value: 'From position 2 to 4' },
    ];
    const { container } = render(DiffView, { props: { changes } });
    const [added, removed, changed, moved] = rows(container);
    expect(added.textContent).toMatch(/Subtitle\s*Added\s*Light shoes for long days\./);
    expect(removed.textContent).toMatch(/Banner\s*Removed\s*Spring sale/);
    expect(changed.textContent).toMatch(
      /Title\s*Changed\s*Removed\s*Run far\s*Added\s*Run further/,
    );
    expect(moved.textContent).toMatch(/Pricing\s*Moved\s*From position 2 to 4/);
    // The minus sign and the cross read at the font's whim: words only.
    expect(container.textContent).not.toMatch(/[−×+]/);
  });

  it('takes the direction of every label and value from its own text', () => {
    const { container } = render(DiffView, {
      props: { changes: [{ kind: 'changed', label: 'العنوان', before: 'مرحبا', after: 'Hello' }] },
    });
    const directed = [...container.querySelectorAll('[dir="auto"]')].map((el) =>
      el.textContent?.trim(),
    );
    expect(directed).toEqual(['العنوان', 'مرحبا', 'Hello']);
  });

  it('marks an emptied value as empty rather than drawing nothing', () => {
    const { container } = render(DiffView, {
      props: { changes: [{ kind: 'changed', label: 'Subtitle', before: 'Old', after: '' }] },
    });
    expect(container.textContent).toMatch(/Added\s*Empty/);
  });

  it('shows the first 400 characters of a long value, and all of it on request', async () => {
    const long = 'a'.repeat(20_000);
    const { container, getByRole } = render(DiffView, {
      props: { changes: [{ kind: 'added', label: 'Body', value: long }] },
    });
    const value = () => container.querySelector('[dir="auto"]:not(span)')!.textContent!.trim();
    expect(value()).toHaveLength(400);
    const toggle = getByRole('button', { name: 'Show all of Body' });
    expect(toggle.textContent?.trim()).toBe('Show all');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(toggle);
    expect(value()).toHaveLength(20_000);
    const less = getByRole('button', { name: 'Show less of Body' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
  });

  it('names each Show all by its value, so a list of buttons tells them apart', () => {
    const long = 'b'.repeat(500);
    const { getAllByRole } = render(DiffView, {
      props: {
        changes: [
          { kind: 'changed', label: 'Body', before: long, after: long },
          { kind: 'added', label: 'Footer', value: long },
        ],
      },
    });
    expect(getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Show all of Body, removed',
      'Show all of Body, added',
      'Show all of Footer',
    ]);
  });

  it('folds every value again when the caller shows other changes', async () => {
    const long = 'c'.repeat(500);
    const { getByRole, rerender } = render(DiffView, {
      props: { changes: [{ kind: 'added', label: 'Body', value: long }] },
    });
    await fireEvent.click(getByRole('button', { name: 'Show all of Body' }));
    await rerender({ changes: [{ kind: 'added', label: 'Notes', value: long }] });
    expect(getByRole('button', { name: 'Show all of Notes' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('cuts a long value between characters a reader sees as whole', () => {
    // 399 letters, then a family emoji of five code points, then more: the
    // cut lands after the emoji, never inside it.
    const family = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}';
    const { container } = render(DiffView, {
      props: {
        changes: [
          { kind: 'added', label: 'Body', value: `${'a'.repeat(399)}${family}${'b'.repeat(50)}` },
        ],
      },
    });
    const shown = container.querySelector('p[dir="auto"]')!.textContent!.trim();
    expect(shown).toBe(`${'a'.repeat(399)}${family}`);
  });

  it('shows a value of exactly 400 characters whole, with no toggle', () => {
    const { container, queryByRole } = render(DiffView, {
      props: {
        changes: [{ kind: 'added', label: 'Body', value: 'é'.normalize('NFD').repeat(400) }],
      },
    });
    expect(container.querySelector('p[dir="auto"]')!.textContent!.trim()).toHaveLength(800);
    expect(queryByRole('button')).toBeNull();
  });
});
