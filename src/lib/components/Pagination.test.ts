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
