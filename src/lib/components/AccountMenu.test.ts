import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import AccountMenu from './AccountMenu.svelte';

const items = createRawSnippet(() => ({
  render: () => `<div><a href="/settings">Account settings</a></div>`,
}));

describe('AccountMenu', () => {
  it('is a disclosure that works without script', () => {
    // The panel holds links and a form post. Both have to keep working when
    // hydration fails or never runs, which is when somebody most needs to be
    // able to sign out.
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    const details = container.querySelector('details')!;
    expect(details).toBeTruthy();
    expect(details.querySelector('summary')).toBeTruthy();
    expect(details.open).toBe(false);
    expect(container.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  it('derives initials from the name', () => {
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    expect(container.querySelector('summary span')?.textContent?.trim()).toBe('PJ');
  });

  it('derives readable initials from an email', () => {
    // An account with no display name shows its email here. Splitting on the
    // separators an address uses gives "KL"; splitting on spaces alone gives
    // "K", and taking the first two characters gives "ka".
    const { container } = render(AccountMenu, {
      props: { name: 'karo.lailatul@example.com', children: items },
    });
    expect(container.querySelector('summary span')?.textContent?.trim()).toBe('KL');
  });

  it('takes explicit initials over the derived ones', () => {
    const { container } = render(AccountMenu, {
      props: { name: 'Paid Journey', initials: 'LY', children: items },
    });
    expect(container.querySelector('summary span')?.textContent?.trim()).toBe('LY');
  });

  it('repeats the identity inside the panel, where the trigger truncates it', () => {
    const { getByText } = render(AccountMenu, {
      props: { name: 'Paid Journey', secondary: 'paid@example.com', children: items },
    });
    expect(getByText('paid@example.com')).toBeTruthy();
  });

  it('hides the avatar from the accessible name', () => {
    // The initials are paint. Left readable they prefix the trigger's name
    // with two letters nobody would speak at it.
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    expect(container.querySelector('summary span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hangs the panel from the trailing edge, below the trigger', () => {
    // The sidebar foot was the other candidate and it cannot work: the column
    // is already full height, so the last entry - Sign out, every time - opens
    // past the bottom of the window.
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    const panel = container.querySelector('details > div')!;
    expect(panel.className).toContain('top-full');
    expect(panel.className).toContain('end-0');
  });
});
