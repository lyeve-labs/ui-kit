import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AvatarGroup from './AvatarGroup.svelte';

const users = [
  { name: 'Ann A' },
  { name: 'Bob B' },
  { name: 'Cy C' },
  { name: 'Dan D' },
  { name: 'Eve E' },
  { name: 'Fay F' },
];

describe('AvatarGroup', () => {
  it('renders only up to max avatars and an overflow badge', () => {
    const { getByText } = render(AvatarGroup, { props: { users, max: 4 } });
    // 4 visible initials + a "+2" overflow badge for the remaining 2.
    expect(getByText('AA')).toBeTruthy();
    expect(getByText('DD')).toBeTruthy();
    expect(getByText('+2')).toBeTruthy();
  });

  it('does not render an overflow badge when all users fit', () => {
    const { queryByText } = render(AvatarGroup, {
      props: { users: users.slice(0, 3), max: 4 },
    });
    expect(queryByText(/^\+/)).toBeNull();
  });
});
