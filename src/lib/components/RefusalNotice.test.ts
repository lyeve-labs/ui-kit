import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import RefusalNotice from './RefusalNotice.svelte';

afterEach(cleanup);

const TITLE = 'Items is at its limit';
const BODY = '4 of 4 items are in use, which is the most this instance allows.';
const SETTINGS = { href: '/settings/license', label: 'View the license' };

function mount(props: Partial<{ forward: { href: string; label: string } | null; lead: boolean }>) {
  return render(RefusalNotice, { props: { title: TITLE, body: BODY, link: SETTINGS, ...props } });
}

describe('RefusalNotice', () => {
  it('draws the title and the sentence it is given as a warning', () => {
    const { container, getByRole } = mount({});
    expect(container.textContent).toContain(TITLE);
    expect(container.textContent).toContain(BODY);
    expect(container.querySelector('[data-testid="refusal-notice"]')).not.toBeNull();
    expect(getByRole('link', { name: 'View the license' }).getAttribute('href')).toBe(
      '/settings/license',
    );
  });

  it('offers only the link it always offers when there is no way forward', () => {
    const { queryAllByRole } = mount({ forward: null });
    expect(queryAllByRole('link').map((a) => a.textContent?.trim())).toEqual(['View the license']);
  });

  it('keeps the always-offered link a secondary when it is the only one', () => {
    const { getByRole } = mount({});
    expect(getByRole('link', { name: 'View the license' }).classList.contains('bg-surface-2')).toBe(
      true,
    );
  });

  // The notice sits in a drawer or a page that has its own Create or Save,
  // and a surface holds one primary.
  it('leads with the way forward as a secondary, and the other link after it as a ghost', () => {
    const forward = { href: '/settings/license?item=items', label: 'How to raise the limit' };
    const [first, second] = mount({ forward }).getAllByRole('link');
    expect(first.textContent?.trim()).toBe('How to raise the limit');
    expect(first.getAttribute('href')).toBe(forward.href);
    expect(first.classList.contains('bg-brand')).toBe(false);
    expect(first.classList.contains('bg-surface-2')).toBe(true);
    expect(second.textContent?.trim()).toBe('View the license');
    expect(second.classList.contains('bg-brand')).toBe(false);
    expect(second.classList.contains('bg-surface-2')).toBe(false);
  });

  it('makes the way forward the primary only where it is the one action on its surface', () => {
    const forward = { href: '/settings/license?item=items', label: 'How to raise the limit' };
    const [first, second] = mount({ forward, lead: true }).getAllByRole('link');
    expect(first.classList.contains('bg-brand')).toBe(true);
    expect(second.classList.contains('bg-surface-2')).toBe(true);
  });

  it('opens a way forward on another origin in a tab of its own', () => {
    const forward = { href: 'https://shop.example.com/more', label: 'How to raise the limit' };
    const more = mount({ forward }).getByRole('link', { name: 'How to raise the limit' });
    expect(more.getAttribute('target')).toBe('_blank');
    expect(more.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps a way forward on this origin in the same tab', () => {
    const forward = { href: '/settings/license?item=items', label: 'How to raise the limit' };
    const here = mount({ forward }).getByRole('link', { name: 'How to raise the limit' });
    expect(here.getAttribute('target')).toBeNull();
    expect(here.getAttribute('rel')).toBeNull();
  });
});
