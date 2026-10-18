import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import GateNotice from './GateNotice.svelte';
import type { Gate, GateWords } from '../internal/gate.js';

afterEach(cleanup);

const WORDS: GateWords = {
  absent: 'The cache is not part of this build, so nothing is cached.',
  full: { title: 'Cache is at its limit', body: '7 of 7 are in use.' },
  forbidden: 'Your role cannot open cache. Ask an administrator if you need it.',
  busy: { title: 'Too many requests', body: 'Wait a moment, then try again.' },
  unavailable: {
    title: 'Temporarily unavailable',
    body: 'The server did not answer, so cache could not be read. Nothing was changed.',
  },
  retry: 'Try again',
};

const locked = createRawSnippet((url: () => string) => ({
  render: () => `<p data-testid="locked">Not enabled: <a href="${url()}">How to enable it</a></p>`,
}));

const RETRY = '/cache?tab=rules&offset=50';

function mount(gate: Gate) {
  return render(GateNotice, { props: { gate, words: WORDS, locked, retryHref: RETRY } });
}

const ALL: Gate[] = [
  { state: 'absent' },
  { state: 'locked', forwardHref: '/settings/cache' },
  { state: 'full', limit: 7, current: 7 },
  { state: 'forbidden' },
  { state: 'busy' },
  { state: 'unavailable' },
  { state: 'error', message: 'The cache could not be read.' },
];

describe('GateNotice', () => {
  it.each([
    ['absent', { state: 'absent' }, [WORDS.absent]],
    ['full', { state: 'full', limit: 7, current: 7 }, [WORDS.full.title, WORDS.full.body]],
    ['forbidden', { state: 'forbidden' }, [WORDS.forbidden]],
    ['busy', { state: 'busy' }, [WORDS.busy.title, WORDS.busy.body]],
    ['unavailable', { state: 'unavailable' }, [WORDS.unavailable.title, WORDS.unavailable.body]],
    [
      'error',
      { state: 'error', message: 'The cache could not be read.' },
      ['The cache could not be read.'],
    ],
  ] as [string, Gate, string[]][])('draws the sentence passed in for %s', (_, gate, sentences) => {
    const { container } = mount(gate);
    for (const s of sentences) expect(container.textContent).toContain(s);
  });

  it('hands a feature that is not enabled to the page, with the link forward the gate carried', () => {
    const { getByTestId, getByRole } = mount({
      state: 'locked',
      forwardHref: '/settings/cache',
    });
    expect(getByTestId('locked')).toBeTruthy();
    expect(getByRole('link', { name: 'How to enable it' }).getAttribute('href')).toBe(
      '/settings/cache',
    );
  });

  it('draws nothing for a read that answered', () => {
    const { container } = mount({ state: 'ok' });
    expect(container.textContent?.trim()).toBe('');
    expect(container.querySelector('[data-testid="gate-notice"]')).toBeNull();
  });

  it('says which state it drew', () => {
    for (const gate of ALL) {
      const { container } = mount(gate);
      expect(
        container.querySelector('[data-testid="gate-notice"]')?.getAttribute('data-state'),
      ).toBe(gate.state);
      cleanup();
    }
  });

  it('draws only a failed read as a failure', () => {
    for (const gate of ALL) {
      const { container } = mount(gate);
      const danger = container.querySelector('.text-danger') !== null;
      expect(danger, gate.state).toBe(gate.state === 'error');
      cleanup();
    }
  });

  it('carries no link for a full gate, because it draws none', () => {
    expectTypeOf<Extract<Gate, { state: 'full' }>>().toEqualTypeOf<{
      state: 'full';
      limit: number | null;
      current: number | null;
    }>();
    const { container } = mount({ state: 'full', limit: 7, current: 7 });
    expect(container.querySelector('a, button')).toBeNull();
  });

  it('offers nothing to press for a role, because trying again cannot change one', () => {
    const { container } = mount({ state: 'forbidden' });
    expect(container.querySelector('a, button')).toBeNull();
  });
});

describe('Try again', () => {
  function retry(gate: Gate): HTMLAnchorElement | null {
    const { queryByRole } = mount(gate);
    return queryByRole('link', { name: WORDS.retry }) as HTMLAnchorElement | null;
  }

  it('appears on busy, unavailable and error only', () => {
    for (const gate of ALL) {
      const offered = retry(gate) !== null;
      expect(offered, gate.state).toBe(['busy', 'unavailable', 'error'].includes(gate.state));
      cleanup();
    }
  });

  it('links to the address the page passes, so it works before the page hydrates', () => {
    expect(retry({ state: 'unavailable' })?.getAttribute('href')).toBe(RETRY);
  });

  it('asks a router for a fresh document, because it keeps the data of an unchanged address', () => {
    expect(['', 'true']).toContain(retry({ state: 'busy' })?.getAttribute('data-sveltekit-reload'));
  });

  it('carries the label passed in', () => {
    const { getByRole } = render(GateNotice, {
      props: {
        gate: { state: 'error', message: 'No.' },
        words: { ...WORDS, retry: 'Erneut versuchen' },
        locked,
        retryHref: RETRY,
      },
    });
    expect(getByRole('link', { name: 'Erneut versuchen' })).toBeTruthy();
  });
});
