import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Tooltip from './Tooltip.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Tooltip', () => {
  it('renders the trigger children', () => {
    const { getByText } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    expect(getByText('?')).toBeTruthy();
  });

  it('hides the tooltip until hovered', () => {
    const { queryByRole } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('shows the tooltip text on mouse enter and hides on leave', async () => {
    const { container, queryByRole, getByRole } = render(Tooltip, {
      props: { text: 'More info', children: text('?') },
    });
    const wrap = container.firstElementChild as HTMLElement;
    await fireEvent.mouseEnter(wrap);
    expect(getByRole('tooltip').textContent).toContain('More info');
    await fireEvent.mouseLeave(wrap);
    expect(queryByRole('tooltip')).toBeNull();
  });
});
