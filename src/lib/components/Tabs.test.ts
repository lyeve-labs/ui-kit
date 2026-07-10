import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Tabs from './Tabs.svelte';

const items = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity', count: 3 },
];

describe('Tabs', () => {
  it('renders a tab per item', () => {
    const { getAllByRole } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    expect(getAllByRole('tab')).toHaveLength(2);
  });

  it('marks the active tab as selected', () => {
    const { getByText } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    const activeTab = getByText('Overview').closest('[role="tab"]');
    expect(activeTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('renders a count badge when provided', () => {
    const { getByText } = render(Tabs, {
      props: { items, active: 'overview', onchange: vi.fn() },
    });
    expect(getByText('3')).toBeTruthy();
  });

  it('fires onchange with the tab id when clicked', async () => {
    const onchange = vi.fn();
    const { getByText } = render(Tabs, { props: { items, active: 'overview', onchange } });
    await fireEvent.click(getByText('Activity'));
    expect(onchange).toHaveBeenCalledWith('activity');
  });
});
