import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.svelte';

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

  it('renders an ellipsis when there are many pages', () => {
    // page=2 of 10 collapses the tail into a single leading-truncation ellipsis.
    const { getAllByText } = render(Pagination, {
      props: { page: 2, total: 200, perPage: 20, onchange: vi.fn() },
    });
    expect(getAllByText('…').length).toBe(1);
  });

  it('renders both leading and trailing ellipsis without duplicate-key crash', () => {
    // page=5 of 10 triggers both leading and trailing ellipsis.
    // Before the fix, this threw each_key_duplicate in Svelte.
    const { getAllByText } = render(Pagination, {
      props: { page: 5, total: 200, perPage: 20, onchange: vi.fn() },
    });
    expect(getAllByText('…').length).toBe(2);
  });
});
