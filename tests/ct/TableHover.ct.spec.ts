/**
 * A hovered table row, measured in the pixels a reader sees.
 *
 * The head row and a hovered row once took one fill, so a hovered first row
 * read as a second head row. CIEDE2000 is the distance at which two patches
 * stop reading as one color: under about 2 a reader sees one color, and past
 * about 6 a hover reads as loud.
 */

import { test, expect, type Locator, type Page } from '@playwright/experimental-ct-svelte';
import TableHoverStory from './TableHoverStory.svelte';
import { styleWithKit } from './kit-css.js';

const BAR = { hoverHead: 3, hoverRestMin: 2, hoverRestMax: 6 };

type Rgb = [number, number, number];

function lab([r, g, b]: Rgb): Rgb {
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

function de00(p: Rgb, q: Rgb): number {
  const [L1, a1, b1] = lab(p);
  const [L2, a2, b2] = lab(q);
  const rad = (d: number) => (d * Math.PI) / 180;
  const deg = (r: number) => (r * 180) / Math.PI;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1 = Math.hypot(a1p, b1);
  const C2 = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) =>
    a === 0 && b === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360;
  const h1 = hue(b1, a1p);
  const h2 = hue(b2, a2p);
  let dh = 0;
  if (C1 * C2 !== 0) {
    dh = h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 < -180 ? h2 - h1 + 360 : h2 - h1;
  }
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin(rad(dh / 2));
  const Lb = (L1 + L2) / 2;
  const Cp = (C1 + C2) / 2;
  let hb = h1 + h2;
  if (C1 * C2 !== 0) {
    hb =
      Math.abs(h1 - h2) <= 180
        ? (h1 + h2) / 2
        : h1 + h2 < 360
          ? (h1 + h2 + 360) / 2
          : (h1 + h2 - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hb - 30)) +
    0.24 * Math.cos(rad(2 * hb)) +
    0.32 * Math.cos(rad(3 * hb + 6)) -
    0.2 * Math.cos(rad(4 * hb - 63));
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const Sc = 1 + 0.045 * Cp;
  const Sh = 1 + 0.015 * Cp * T;
  const Rt =
    -Math.sin(rad(60 * Math.exp(-(((hb - 275) / 25) ** 2)))) *
    2 *
    Math.sqrt(Cp ** 7 / (Cp ** 7 + 25 ** 7));
  const dL = L2 - L1;
  const dC = C2 - C1;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

/**
 * The mean color of a 3px patch inside a cell's padding, read from a
 * screenshot rather than from computed styles, so a fill drawn by any means
 * counts.
 */
async function sample(page: Page, cell: Locator): Promise<Rgb> {
  const b = await cell.boundingBox();
  if (!b) throw new Error('cell has no box');
  const png = await page.screenshot({ clip: { x: b.x + 4, y: b.y + 4, width: 3, height: 3 } });
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const s = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += d[i + k];
    return s.map((v) => v / (d.length / 4)) as Rgb;
  }, png.toString('base64'));
}

/** Rests the pointer away from the table and lets the fade settle. */
async function settle(page: Page, at?: Locator) {
  if (at) await at.hover({ position: { x: 2, y: 2 } });
  else await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`a hovered row in the ${theme} theme`, () => {
    test('stays apart from the head row and calm against a row at rest', async ({
      mount,
      page,
    }) => {
      const c = await mount(TableHoverStory);
      await styleWithKit(page, theme);
      const head = c.locator('thead th').nth(1);
      const row = c.getByTestId('first-row');
      const cell = row.locator('td').nth(1);

      await settle(page);
      const headColor = await sample(page, head);
      const rest = await sample(page, cell);
      await settle(page, row);
      const hover = await sample(page, cell);

      const hoverHead = de00(hover, headColor);
      const hoverRest = de00(hover, rest);
      console.log(
        `${theme}: head ${headColor.map(Math.round)} rest ${rest.map(Math.round)} hover ${hover.map(Math.round)} dE00 hover-head ${hoverHead.toFixed(1)} hover-rest ${hoverRest.toFixed(1)}`,
      );
      expect(hoverHead, 'a hovered row reads as the head row').toBeGreaterThanOrEqual(
        BAR.hoverHead,
      );
      expect(hoverRest, 'a hovered row barely shows').toBeGreaterThanOrEqual(BAR.hoverRestMin);
      expect(hoverRest, 'a hovered row is loud').toBeLessThanOrEqual(BAR.hoverRestMax);
    });

    test('leaves a group label row unlit under the pointer', async ({ mount, page }) => {
      const c = await mount(TableHoverStory);
      await styleWithKit(page, theme);
      const label = c.getByTestId('label-row');
      const cell = label.locator('th');

      await settle(page);
      const rest = await sample(page, cell);
      await settle(page, label);
      const hover = await sample(page, cell);

      expect(de00(hover, rest)).toBeLessThan(0.5);
    });
  });
}
