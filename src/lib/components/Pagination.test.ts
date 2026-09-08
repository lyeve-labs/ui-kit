import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.svelte';

/** The drawn gap markers, which are the only aria-hidden spans the list holds. */
function gaps(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('span[aria-hidden="true"]')];
}

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(Pagination, {
      props: { page: 1, total: 10, perPage: 20, onchange: vi.fn() },
    });
    expect(container.querySelector('button')).toBeNull();
  });

  it('shows the current range summary', () => {
    const { getByText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, onchange: vi.fn() },
    });
    expect(getByText(/of 100/)).toBeTruthy();
  });

  it('disables the previous button on the first page', () => {
    const { getByLabelText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, onchange: vi.fn() },
    });
    expect((getByLabelText('Previous page') as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText('Next page') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables the next button on the last page', () => {
    const { getByLabelText } = render(Pagination, {
      props: { page: 5, total: 100, perPage: 20, onchange: vi.fn() },
    });
    expect((getByLabelText('Next page') as HTMLButtonElement).disabled).toBe(true);
  });

  it('fires onchange with the next page number', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, onchange },
    });
    await fireEvent.click(getByLabelText('Next page'));
    expect(onchange).toHaveBeenCalledWith(2);
  });

  it('fires onchange with a clicked page number', async () => {
    const onchange = vi.fn();
    const { getByText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, onchange },
    });
    await fireEvent.click(getByText('2'));
    expect(onchange).toHaveBeenCalledWith(2);
  });

  it('marks the current page with aria-current', () => {
    const { getByText } = render(Pagination, {
      props: { page: 3, total: 100, perPage: 20, onchange: vi.fn() },
    });
    expect(getByText('3').getAttribute('aria-current')).toBe('page');
  });

  it('elides a long run of pages with one gap marker', () => {
    // page=2 of 10 collapses the tail into a single leading-truncation gap.
    const { container } = render(Pagination, {
      props: { page: 2, total: 200, perPage: 20, onchange: vi.fn() },
    });
    expect(gaps(container).length).toBe(1);
  });

  it('elides both ends when the current page sits in the middle', () => {
    // Two gaps in one list is what made a positional key ambiguous.
    const { container } = render(Pagination, {
      props: { page: 10, total: 400, perPage: 20, onchange: vi.fn() },
    });
    expect(gaps(container).length).toBe(2);
    expect(container.textContent).toContain('9');
    expect(container.textContent).toContain('11');
  });

  it('never renders the horizontal-ellipsis character', () => {
    // The gap used to be the literal character, both as the sentinel value and
    // as the text of the span. The consistency suite rejects it outright.
    const { container } = render(Pagination, {
      props: { page: 10, total: 400, perPage: 20, onchange: vi.fn() },
    });
    // Written as an escape: the character is banned in this repo's source, and
    // the point of the assertion is that it reaches no reader either.
    expect(container.textContent).not.toMatch(/\u2026/);
    expect(container.textContent).not.toContain('gap');
  });

  it('hides the gap marker from a screen reader', () => {
    // Without aria-hidden the marker was spoken as "horizontal ellipsis"
    // between two page numbers, which says nothing the numbers do not.
    const { container } = render(Pagination, {
      props: { page: 10, total: 400, perPage: 20, onchange: vi.fn() },
    });
    for (const gap of gaps(container)) {
      expect(gap.getAttribute('aria-hidden')).toBe('true');
      expect(gap.textContent?.trim()).toBe('');
    }
  });

  it('draws the gap as three dots rather than typing them', () => {
    const { container } = render(Pagination, {
      props: { page: 10, total: 400, perPage: 20, onchange: vi.fn() },
    });
    const svg = gaps(container)[0].querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')?.getAttribute('d')).toBe('M5 12h.01M12 12h.01M19 12h.01');
  });

  it('offers no gap marker as a click target', () => {
    // A span, not a button: the gap stands for pages the user cannot reach in
    // one step, so there is nothing for a click to do.
    const { container } = render(Pagination, {
      props: { page: 10, total: 400, perPage: 20, onchange: vi.fn() },
    });
    for (const gap of gaps(container)) {
      expect(gap.tagName).toBe('SPAN');
    }
  });

  it('states that there are no results instead of rendering nothing', () => {
    // An empty list has one page, and the whole component sat behind
    // `totalPages > 1`, so the 'No results' branch it carried could never run.
    const { getByText } = render(Pagination, {
      props: { page: 1, total: 0, onchange: () => {} },
    });
    expect(getByText('No results')).toBeTruthy();
  });

  it('still states the count when everything fits on one page', () => {
    const { getByText, queryByLabelText } = render(Pagination, {
      props: { page: 1, total: 5, perPage: 20, onchange: () => {} },
    });
    expect(getByText('1 to 5 of 5')).toBeTruthy();
    // One page needs no controls, only the count.
    expect(queryByLabelText('Next page')).toBeNull();
  });

  it('writes its range without an en dash', () => {
    // The estate bans en and em dashes in copy, and this one rendered into the
    // DOM of every paginated list rather than sitting in a comment.
    const { container } = render(Pagination, {
      props: { page: 2, total: 100, perPage: 20, onchange: () => {} },
    });
    expect(container.textContent).toContain('21 to 40 of 100');
    expect(container.textContent).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('Pagination under a finger', () => {
  const page = (props: Record<string, unknown> = {}) =>
    render(Pagination, {
      props: { page: 3, total: 100, perPage: 20, onchange: vi.fn(), ...props },
    });

  /*
   * Paging is a thumb gesture and `hover:` never matches a thumb, so before
   * this a tap changed the page with nothing on the control to say it had
   * landed.
   */
  it('gives every control that is not the current page a held state', () => {
    const { container } = page();
    const buttons = [...container.querySelectorAll('button')].filter(
      (b) => b.getAttribute('aria-current') === null,
    );
    expect(buttons.length).toBeGreaterThan(2);
    for (const b of buttons) expect(b.className).toMatch(/\bactive:/);
  });

  it('turns the previous and next arrows round in a right-to-left page', () => {
    const { container } = page();
    const arrows = [...container.querySelectorAll('button svg')];
    expect(arrows.length).toBe(2);
    for (const svg of arrows) expect(svg.getAttribute('class')).toContain('rtl:rotate-180');
  });

  it('pushes the controls to the reading end rather than the left', () => {
    const { container } = page();
    const group = container.querySelector('button')?.parentElement as HTMLElement;
    expect(group.className).toContain('ms-auto');
    expect(group.className).not.toContain('ml-auto');
  });
});

/*
 * A callback pager does nothing until the page hydrates, so the first paint of
 * every server-rendered list carried a control that looked live and was not.
 * One application in the estate had already stopped using this component and
 * shipped its own link pager for exactly that reason.
 */
describe('Pagination as links', () => {
  const to = (page: number) => `/users?page=${page}`;

  it('renders the steps as links rather than buttons', () => {
    const { container, getByLabelText } = render(Pagination, {
      props: { page: 2, total: 100, perPage: 20, href: to },
    });
    expect(container.querySelector('button')).toBeNull();
    expect(getByLabelText('Previous page').tagName).toBe('A');
    expect(getByLabelText('Next page').tagName).toBe('A');
  });

  it('sends each step to the page the caller built for it', () => {
    const { getByLabelText } = render(Pagination, {
      props: { page: 3, total: 100, perPage: 20, href: to },
    });
    expect(getByLabelText('Previous page').getAttribute('href')).toBe('/users?page=2');
    expect(getByLabelText('Next page').getAttribute('href')).toBe('/users?page=4');
  });

  it('links every numbered page it draws', () => {
    const { getByText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, href: to },
    });
    expect(getByText('2').getAttribute('href')).toBe('/users?page=2');
    expect(getByText('5').getAttribute('href')).toBe('/users?page=5');
  });

  it('marks the current page the same way it does with buttons', () => {
    const { getByText } = render(Pagination, {
      props: { page: 3, total: 100, perPage: 20, href: to },
    });
    expect(getByText('3').getAttribute('aria-current')).toBe('page');
    expect(getByText('2').getAttribute('aria-current')).toBeNull();
  });

  it('gives a step with nowhere to go no href at all', () => {
    // An anchor has no `disabled` and `disabled:` never matches one, so a link
    // that keeps its href on the first page is a live control that pages to
    // page zero. Dropping the href is what removes it from the tab order.
    const { getByLabelText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, href: to },
    });
    const prev = getByLabelText('Previous page');
    expect(prev.hasAttribute('href')).toBe(false);
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(prev.className).toContain('pointer-events-none');
  });

  it('refuses a scheme that executes, wherever the builder got it', () => {
    // The builder is caller code and the caller builds from data.
    const { getByLabelText } = render(Pagination, {
      props: { page: 1, total: 100, perPage: 20, href: () => 'javascript:alert(1)' },
    });
    expect(getByLabelText('Next page').hasAttribute('href')).toBe(false);
  });

  it('keeps the held state on a link, which a finger needs either way', () => {
    const { getByLabelText } = render(Pagination, {
      props: { page: 2, total: 100, perPage: 20, href: to },
    });
    expect(getByLabelText('Next page').className).toMatch(/\bactive:/);
  });

  it('still states the count beside the links', () => {
    const { getByText } = render(Pagination, {
      props: { page: 2, total: 100, perPage: 20, href: to },
    });
    expect(getByText('21 to 40 of 100')).toBeTruthy();
  });
});

/*
 * Several list endpoints report no total at all, and the ones that do report it
 * cannot afford the count on a tenant with ten thousand rows. Asking for one row
 * more than the page holds answers "is there another page" without counting the
 * collection, and that answer is all this mode needs.
 */
describe('Pagination without a total', () => {
  it('offers the next page on the strength of hasNext alone', () => {
    const { getByLabelText } = render(Pagination, {
      props: { page: 1, hasNext: true, onchange: vi.fn() },
    });
    expect((getByLabelText('Next page') as HTMLButtonElement).disabled).toBe(false);
    expect((getByLabelText('Previous page') as HTMLButtonElement).disabled).toBe(true);
  });

  it('fires onchange with the next page number', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(Pagination, {
      props: { page: 4, hasNext: true, onchange },
    });
    await fireEvent.click(getByLabelText('Next page'));
    expect(onchange).toHaveBeenCalledWith(5);
  });

  it('stops at the end of the list when there is no next page', () => {
    const { getByLabelText } = render(Pagination, {
      props: { page: 4, hasNext: false, onchange: vi.fn() },
    });
    expect((getByLabelText('Next page') as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText('Previous page') as HTMLButtonElement).disabled).toBe(false);
  });

  it('draws no numbered pages, because it does not know where the list ends', () => {
    const { container, queryByText } = render(Pagination, {
      props: { page: 4, hasNext: true, onchange: vi.fn() },
    });
    expect(queryByText('4')).toBeNull();
    expect(gaps(container).length).toBe(0);
  });

  it('says which page it is on rather than inventing a range', () => {
    // The last page of an uncounted list is short and nothing tells this
    // component how short, so "61 to 80" would be a number it made up.
    const { getByText, container } = render(Pagination, {
      props: { page: 4, hasNext: true, onchange: vi.fn() },
    });
    expect(getByText('Page 4')).toBeTruthy();
    expect(container.textContent).not.toContain(' of ');
  });

  it('renders no controls for a single uncounted page', () => {
    const { queryByLabelText, getByText } = render(Pagination, {
      props: { page: 1, hasNext: false, onchange: vi.fn() },
    });
    expect(queryByLabelText('Next page')).toBeNull();
    expect(queryByLabelText('Previous page')).toBeNull();
    expect(getByText('Page 1')).toBeTruthy();
  });

  it('reads a total of zero as an empty counted list, not as an uncounted one', () => {
    // `total` absent is the uncounted list. Present and zero is a list that was
    // counted and holds nothing, which has its own sentence.
    const { getByText } = render(Pagination, {
      props: { page: 1, total: 0, hasNext: false, onchange: vi.fn() },
    });
    expect(getByText('No results')).toBeTruthy();
  });

  it('pages an uncounted list from links as well', () => {
    // The two additions compose: no total and no hydration at once is the case
    // the application that forked this component was actually in.
    const { getByLabelText } = render(Pagination, {
      props: { page: 2, hasNext: true, href: (p: number) => `/audit?page=${p}` },
    });
    expect(getByLabelText('Previous page').getAttribute('href')).toBe('/audit?page=1');
    expect(getByLabelText('Next page').getAttribute('href')).toBe('/audit?page=3');
  });
});
