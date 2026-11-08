/**
 * Where a wrapped copy field breaks an id, measured in the lines Chromium draws.
 *
 * The field broke anywhere, so a UUID split inside a group, such as "4047-a"
 * then "5a0-10bca1beeaaa". A line may end inside a group only when that group
 * is too long to fit on a line of its own. The groups below start with digits
 * as well as letters, because a hyphen before a digit is the case the line
 * breaking rules treat apart from the rest.
 */

import { test, expect } from '@playwright/experimental-ct-svelte';
import CopyFieldWrapStory from './CopyFieldWrapStory.svelte';
import { styleWithKit } from './kit-css.js';

const IDS = [
  '0f2c4047-a5a0-4b3c-9d1e-10bca1beeaaa',
  '123e4567-e89b-12d3-a456-426614174000',
  '550e8400-0e29-41d4-0716-446655440000',
];

for (const width of [140, 180, 220, 260]) {
  test(`breaks an id after a hyphen at ${width}px`, async ({ mount, page }) => {
    for (const value of IDS) {
      const story = await mount(CopyFieldWrapStory, { props: { value, width } });
      await styleWithKit(page, 'dark');
      const sizer = story.locator('span[aria-hidden="true"]').first();
      const { lines, longest } = await sizer.evaluate((el) => {
        const text = el.firstChild as Text;
        const range = document.createRange();
        const tops: number[] = [];
        for (let i = 0; i < text.length; i++) {
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          tops.push(Math.round(range.getBoundingClientRect().top));
        }
        const lines: string[] = [];
        let line = '';
        for (let i = 0; i < text.length; i++) {
          if (i > 0 && tops[i] !== tops[i - 1]) {
            lines.push(line);
            line = '';
          }
          line += text.data[i];
        }
        lines.push(line);
        return { lines, longest: Math.max(...lines.map((l) => l.length)) };
      });
      let at = 0;
      for (const line of lines.slice(0, -1)) {
        at += line.length;
        // The group the line ends in, from the hyphen before the break to the one after it.
        const start = value.lastIndexOf('-', at - 1) + 1;
        const end = value.indexOf('-', at);
        const group = value.slice(start, end === -1 ? value.length : end + 1);
        const brokeInside = !line.endsWith('-') && group.length <= longest;
        expect({ value, width, line, brokeInside }).toEqual({
          value,
          width,
          line,
          brokeInside: false,
        });
      }
      expect(lines.join('')).toBe(value);
      await expect(story.getByRole('textbox', { name: 'Site ID' })).toHaveValue(value);
      await story.unmount();
    }
  });
}
