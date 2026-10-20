/**
 * GateNotice from the keyboard: Try again is reached by Tab and followed on
 * Enter in each state that offers it.
 */

import { test } from '@playwright/experimental-ct-svelte';
import NoticeStory from './NoticeStory.svelte';
import { tabTo } from './keys.js';

const OFFERED = ['busy', 'unavailable', 'error'];

test.describe('GateNotice', () => {
  for (const state of OFFERED) {
    test(`asks for the page again on Enter when ${state}`, async ({ mount, page }) => {
      const story = await mount(NoticeStory, { props: { part: 'gate' } });
      const notice = story.locator(`[data-testid="gate-notice"][data-state="${state}"]`);
      await tabTo(page, notice.getByRole('link', { name: 'Try again' }));
      await page.keyboard.press('Enter');
      await page.waitForURL((url) => url.pathname === '/reports');
    });
  }
});
