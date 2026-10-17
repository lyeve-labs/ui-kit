import { test, expect } from '@playwright/experimental-ct-svelte';
import TableStory from './TableStory.svelte';

test.describe('Table', () => {
  test('renders rows and columns', async ({ mount }) => {
    const c = await mount(TableStory, {
      props: {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'role', label: 'Role' },
        ],
        rows: [
          { name: 'Alice', role: 'Admin' },
          { name: 'Bob', role: 'User' },
        ],
      },
    });
    await expect(c).toBeVisible();
    await expect(c).toContainText('Alice');
    await expect(c).toContainText('Admin');
  });

  test('renders empty state', async ({ mount }) => {
    const c = await mount(TableStory, {
      props: { columns: [{ key: 'name', label: 'Name' }], rows: [] },
    });
    await expect(c).toBeVisible();
  });
});
