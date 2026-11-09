import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import AccountMenu from './AccountMenu.svelte';

const items = createRawSnippet(() => ({
  render: () => `<div><a href="/settings">Account settings</a></div>`,
}));

describe('AccountMenu', () => {
  it('is a details disclosure, so it opens without script', () => {
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
    // separators an address uses gives "KL". Splitting on spaces alone gives
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

  it('names its trigger when the name is hidden on a narrow screen', () => {
    // Below the sm breakpoint the trigger shows only the avatar, which is
    // hidden from the accessibility tree, so the summary needs a name of its own.
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    expect(container.querySelector('summary')?.getAttribute('aria-label')).toBe(
      'Paid Journey, account menu',
    );
  });

  it('hides the avatar from the accessible name', () => {
    // The initials are paint. Left readable they prefix the trigger's name
    // with two letters nobody would speak at it.
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    expect(container.querySelector('summary span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hangs the panel from the trailing edge, below the trigger', () => {
    // The sidebar foot was the other candidate and it cannot work: the column
    // is already full height, so the last entry (Sign out, every time) opens
    // past the bottom of the window.
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    const panel = container.querySelector('details > div')!;
    expect(panel.className).toContain('top-full');
    expect(panel.className).toContain('end-0');
  });

  it('draws the footer after a rule, below the rows', () => {
    const footer = createRawSnippet(() => ({
      render: () =>
        `<form method="POST" action="/logout"><button type="submit">Sign out</button></form>`,
    }));
    const { container } = render(AccountMenu, {
      props: { name: 'Paid Journey', children: items, footer },
    });
    const form = container.querySelector('form[action="/logout"]')!;
    const rule = form.parentElement!;
    expect(rule.className).toContain('border-t');
    expect(rule.className).toContain('border-line');
    const link = container.querySelector('a[href="/settings"]')!;
    expect(link.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws no rule when there is no footer', () => {
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    expect(container.querySelector('details > div .border-t')).toBeNull();
  });

  it('keeps the trigger lit while its panel is open', () => {
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    expect(container.querySelector('summary')?.className).toContain('[[open]>&]:bg-surface-2');
  });

  it('closes on a press outside it and on Escape, which returns focus to the trigger', async () => {
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: items } });
    const details = container.querySelector('details')!;
    const summary = details.querySelector('summary')!;

    details.open = true;
    await fireEvent(details, new Event('toggle'));
    await fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);

    details.open = true;
    await fireEvent(details, new Event('toggle'));
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('closes once a row is picked and gives focus back to the trigger', async () => {
    // A row moves within the app, and the layout that holds the menu stays
    // mounted, so a panel left open hangs over the page the reader asked for.
    const rows = createRawSnippet(() => ({
      render: () =>
        `<div><p>Engines</p><a href="#settings">Account settings</a><form><button type="submit">Switch</button></form></div>`,
    }));
    const submit = vi.fn((event: Event) => event.preventDefault());
    const { container } = render(AccountMenu, { props: { name: 'Paid Journey', children: rows } });
    const details = container.querySelector('details')!;
    const summary = details.querySelector('summary')!;
    container.querySelector('form')!.addEventListener('submit', submit);
    const open = async () => {
      details.open = true;
      await fireEvent(details, new Event('toggle'));
    };

    await open();
    await fireEvent.click(container.querySelector('p')!);
    expect(details.open).toBe(true);

    const followed = await fireEvent.click(container.querySelector('a')!);
    expect(followed, 'the link still runs').toBe(true);
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);

    await open();
    await fireEvent.click(container.querySelector('button[type="submit"]')!);
    expect(details.open).toBe(false);
    expect(submit).toHaveBeenCalledOnce();
  });

  it('leaves a click its host canceled alone and closes for any button that posts', async () => {
    // A host that cancels a row's click acts in place, such as asking first,
    // and closing would take the focus from what it opened. A button with no
    // type inside a form posts it like any submit, and one outside a form
    // posts nothing.
    const rows = createRawSnippet(() => ({
      render: () =>
        `<div><a href="#ask">Ask first</a><button>Toggle</button><form><button>Switch</button></form></div>`,
    }));
    const { container, getByText } = render(AccountMenu, {
      props: { name: 'Paid Journey', children: rows },
    });
    const details = container.querySelector('details')!;
    getByText('Ask first').addEventListener('click', (event) => event.preventDefault());
    container.querySelector('form')!.addEventListener('submit', (event) => event.preventDefault());
    details.open = true;
    await fireEvent(details, new Event('toggle'));

    await fireEvent.click(getByText('Ask first'));
    expect(details.open).toBe(true);
    await fireEvent.click(getByText('Toggle'));
    expect(details.open).toBe(true);
    await fireEvent.click(getByText('Switch'));
    expect(details.open).toBe(false);
  });

  it('listens to the document only while it is open', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    try {
      const { container } = render(AccountMenu, {
        props: { name: 'Paid Journey', children: items },
      });
      expect(add.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(0);
      const details = container.querySelector('details')!;
      details.open = true;
      await fireEvent(details, new Event('toggle'));
      expect(add.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(1);
    } finally {
      add.mockRestore();
    }
  });
});
