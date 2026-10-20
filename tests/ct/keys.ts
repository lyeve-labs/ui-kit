/**
 * Reaches a control the way a keyboard reader does, by pressing Tab, so a case
 * that passes proves the control is in the tab order as well as that it acts.
 */

import type { Locator, Page } from '@playwright/experimental-ct-svelte';

export async function tabTo(page: Page, target: Locator, limit = 20) {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Tab did not reach the control in ${limit} presses`);
}
