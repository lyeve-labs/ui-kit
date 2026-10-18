/**
 * RefusalNotice from the keyboard: each link is reached by Tab and followed on
 * Enter, which is the key a link takes.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import NoticeStory from './NoticeStory.svelte';
import { tabTo } from './keys.js';

test.describe('RefusalNotice', () => {
  test('follows the way forward on Enter', async ({ mount, page }) => {
    const story = await mount(NoticeStory, { props: { part: 'refusal' } });
    await tabTo(page, story.getByRole('link', { name: 'Archive old reports' }).first());
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname + url.search === '/reports?view=archive');
  });

  test('follows the link offered on every refusal on Enter', async ({ mount, page }) => {
    const story = await mount(NoticeStory, { props: { part: 'refusal' } });
    await tabTo(page, story.getByRole('link', { name: 'Open settings' }).first());
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/settings');
  });
});
