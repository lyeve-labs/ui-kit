import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { drawn, fixture } from '../../../tests/fixtures/markup.js';
import FilterChips from './FilterChips.svelte';

const options = [
  { value: 'all', label: 'All', count: 41 },
  { value: 'API', label: 'API', count: 3 },
  { value: 'Visual Builders', label: 'Visual Builders', count: 2 },
];

describe('FilterChips', () => {
  it('presses exactly the chip that holds the value', () => {
    const { getAllByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'API' },
    });
    const pressed = getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((b) => b.textContent?.replace(/\s+/g, ''))).toEqual(['API3']);
  });

  it('names the group and reads the count with its label', () => {
    const { getByRole, getAllByText } = render(FilterChips, {
      props: { label: 'Category', options, value: 'all', countLabel: 'on sale' },
    });
    expect(getByRole('group', { name: 'Category' })).toBeTruthy();
    expect(getAllByText('on sale', { exact: false, selector: '.sr-only' })).toHaveLength(3);
  });

  it('keeps a long label on one line, so the row wraps between chips and never inside one', () => {
    const { getByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'all' },
    });
    expect(getByRole('button', { name: /Visual Builders/ }).className).toContain(
      'whitespace-nowrap',
    );
  });

  it('reports a new pick and ignores a press on the chip already chosen', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'all', onchange },
    });
    await fireEvent.click(getByRole('button', { name: /^All/ }));
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(getByRole('button', { name: /^API/ }));
    expect(onchange).toHaveBeenCalledWith('API');
  });
});

describe('FilterChips link mode', () => {
  const links = [
    { value: 'all', label: 'All', count: 12, href: '?status=all' },
    { value: 'open', label: 'Open', count: 7, href: '?status=open' },
    { value: 'closed', label: 'Closed', count: 5, href: '?status=closed' },
  ];

  function anchors(container: HTMLElement): HTMLAnchorElement[] {
    return [...container.querySelectorAll<HTMLAnchorElement>('a')];
  }

  it('renders every chip as an anchor with its href, in a named group, and no button', () => {
    // A status filter that lives in the URL survives a reload and can be
    // shared, and the row works before any script has loaded.
    const { container, getByRole } = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open' },
    });
    expect(getByRole('group', { name: 'Status' })).toBeTruthy();
    expect(anchors(container).map((a) => a.getAttribute('href'))).toEqual([
      '?status=all',
      '?status=open',
      '?status=closed',
    ]);
    expect(container.querySelector('button')).toBeNull();
  });

  it('marks the current chip with aria-current="page" and presses nothing', () => {
    const { container } = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open' },
    });
    expect(anchors(container).map((a) => a.getAttribute('aria-current'))).toEqual([
      null,
      'page',
      null,
    ]);
    expect(container.querySelector('[aria-pressed]')).toBeNull();
  });

  it('paints the current chip the way it paints a pressed one', () => {
    const linked = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open' },
    });
    const [, current, other] = anchors(linked.container);
    const buttons = render(FilterChips, {
      props: {
        label: 'Status',
        options: links.map(({ value, label, count }) => ({ value, label, count })),
        value: 'open',
      },
    });
    const pressed = buttons.container.querySelector('[aria-pressed="true"]') as HTMLElement;
    expect(current.className).toBe(pressed.className);
    expect(other.className).not.toContain('border-brand');
  });

  it('attaches no click handler, so the browser performs the navigation', async () => {
    const onchange = vi.fn();
    const { container } = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open', onchange },
    });
    // Read at the document, after the chip's own handlers had their turn, then
    // canceled there so jsdom does not try to follow the link.
    let prevented: boolean | undefined;
    const seen = (e: Event) => {
      prevented = e.defaultPrevented;
      e.preventDefault();
    };
    document.addEventListener('click', seen);
    await fireEvent.click(anchors(container)[2]);
    document.removeEventListener('click', seen);
    expect(prevented).toBe(false);
    expect(onchange).not.toHaveBeenCalled();
    // The choice is the URL. Nothing in the row moved it.
    expect(anchors(container)[1].getAttribute('aria-current')).toBe('page');
    expect(anchors(container)[2].hasAttribute('aria-current')).toBe(false);
  });

  it('reads the count with its label, as the button mode does', () => {
    const { getAllByText } = render(FilterChips, {
      props: { label: 'Status', options: links, value: 'open', countLabel: 'issues' },
    });
    expect(getAllByText('issues', { exact: false, selector: 'a .sr-only' })).toHaveLength(3);
  });

  it('refuses an href a browser would run as script', () => {
    const { container } = render(FilterChips, {
      props: {
        label: 'Status',
        value: 'a',
        options: [
          { value: 'a', label: 'A', href: 'javascript:alert(1)' },
          { value: 'b', label: 'B', href: '?b' },
        ],
      },
    });
    expect(anchors(container)[0].hasAttribute('href')).toBe(false);
    expect(anchors(container)[1].getAttribute('href')).toBe('?b');
  });

  it('refuses a row that mixes links and buttons', () => {
    // A button beside two links would report a choice the URL never learns
    // about, and nothing on screen would show the caller which is which.
    const mixed = [
      { value: 'all', label: 'All', href: '?status=all' },
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed', href: '?status=closed' },
    ];
    expect(() =>
      render(FilterChips, { props: { label: 'Status', options: mixed, value: 'all' } }),
    ).toThrow(/FilterChips: every option carries href or none does, 2 of 3 did/);
  });

  it('keeps the button mode as it was when no chip carries an href', () => {
    const { container, getAllByRole } = render(FilterChips, {
      props: { label: 'Category', options, value: 'API' },
    });
    expect(anchors(container)).toHaveLength(0);
    expect(getAllByRole('button')).toHaveLength(3);
    expect(container.querySelector('[aria-current]')).toBeNull();
  });
});

describe('FilterChips, field props', () => {
  const chips = [
    { value: 'all', label: 'All', count: 12 },
    { value: 'open', label: 'Open', count: 3 },
  ];
  const chipLinks = chips.map((o) => ({ ...o, href: `?status=${o.value}` }));

  it('renders what it rendered before the field props, when given none of them', () => {
    const buttons = render(FilterChips, {
      props: { label: 'Status', options: chips, value: 'open', countLabel: 'rows' },
    });
    expect(drawn(buttons.container.innerHTML)).toBe(drawn(fixture('filter-chips-buttons.html')));
    const links = render(FilterChips, {
      props: { label: 'Status', options: chipLinks, value: 'open' },
    });
    expect(drawn(links.container.innerHTML)).toBe(drawn(fixture('filter-chips-links.html')));
  });

  it('puts the id on the group and describes the group with the hint', () => {
    const { getByRole, getByText } = render(FilterChips, {
      props: {
        label: 'Status',
        options: chips,
        value: 'all',
        id: 'status',
        hint: 'Filters the list',
      },
    });
    const group = getByRole('group', { name: 'Status' });
    expect(group.id).toBe('status');
    expect(getByText('Filters the list').id).toBe('status-hint');
    expect(getByText('Filters the list').className).toContain('text-faint');
    expect(group.getAttribute('aria-describedby')).toBe('status-hint');
  });

  it('replaces the hint with the error and points the group at it', () => {
    const { getByRole, getByText, queryByText } = render(FilterChips, {
      props: {
        label: 'Status',
        options: chips,
        value: 'all',
        id: 's',
        hint: 'h',
        error: 'Pick a status',
      },
    });
    const group = getByRole('group', { name: 'Status' });
    expect(queryByText('h')).toBeNull();
    expect(getByText('Pick a status').id).toBe('s-error');
    expect(getByText('Pick a status').className).toContain('text-danger');
    expect(group.getAttribute('aria-describedby')).toBe('s-error');
    // ARIA does not allow aria-invalid on a group.
    expect(group.hasAttribute('aria-invalid')).toBe(false);
  });

  it('keeps the caller class on the row when a message shows', () => {
    const { getByRole, getByText } = render(FilterChips, {
      props: { label: 'Status', options: chips, value: 'all', hint: 'h', class: 'mt-4' },
    });
    const group = getByRole('group', { name: 'Status' });
    expect(group.className).toContain('mt-4');
    expect(group.hasAttribute('data-field')).toBe(true);
    const message = getByText('h');
    expect(group.nextElementSibling).toBe(message);
    expect(message.className).toContain('mt-1.5');
  });

  it('gives the messages a generated id when the caller names none', () => {
    const { getByRole, getByText } = render(FilterChips, {
      props: { label: 'Status', options: chips, value: 'all', error: 'Pick a status' },
    });
    const group = getByRole('group', { name: 'Status' });
    const error = getByText('Pick a status');
    expect(group.hasAttribute('id')).toBe(false);
    expect(error.id).toMatch(/-error$/);
    expect(group.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('reads the caller ids after its own message', () => {
    const own = render(FilterChips, {
      props: {
        label: 'Status',
        options: chips,
        value: 'all',
        id: 's',
        hint: 'h',
        describedBy: 'note',
      },
    });
    expect(own.getByRole('group', { name: 'Status' }).getAttribute('aria-describedby')).toBe(
      's-hint note',
    );
    const alone = render(FilterChips, {
      props: { label: 'Kind', options: chips, value: 'all', describedBy: 'kind-note' },
    });
    expect(alone.getByRole('group', { name: 'Kind' }).getAttribute('aria-describedby')).toBe(
      'kind-note',
    );
  });

  it('keeps its links working with every field prop set', () => {
    const { getByRole, getByText, container } = render(FilterChips, {
      props: {
        label: 'Status',
        options: chipLinks,
        value: 'open',
        id: 'status',
        hint: 'Kept in the URL',
        describedBy: 'note',
      },
    });
    const group = getByRole('group', { name: 'Status' });
    expect(getByText('Kept in the URL').id).toBe('status-hint');
    expect(group.getAttribute('aria-describedby')).toBe('status-hint note');
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['?status=all', '?status=open']);
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('button')).toBeNull();
  });

  it('keeps focus on a chip while an error arrives and clears', async () => {
    const { getByRole, rerender } = render(FilterChips, {
      props: { label: 'Status', options: chips, value: 'all' },
    });
    const chip = getByRole('button', { name: /Open/ });
    chip.focus();
    expect(document.activeElement).toBe(chip);
    await rerender({ label: 'Status', options: chips, value: 'all', error: 'Pick a status' });
    expect(document.activeElement).toBe(chip);
    expect(chip.isConnected).toBe(true);
    await rerender({ label: 'Status', options: chips, value: 'all', error: undefined });
    expect(document.activeElement).toBe(chip);
    expect(chip.isConnected).toBe(true);
  });

  it('presses a chip with every field prop set', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(FilterChips, {
      props: { label: 'Status', options: chips, value: 'all', id: 's', error: 'e', onchange },
    });
    await fireEvent.click(getByRole('button', { name: /Open/ }));
    expect(onchange).toHaveBeenCalledWith('open');
  });
});
