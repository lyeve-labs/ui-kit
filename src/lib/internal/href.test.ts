import { describe, expect, it } from 'vitest';
import { safeHref } from './href.js';

describe('safeHref', () => {
  it('passes an ordinary link through untouched', () => {
    expect(safeHref('/admin/users?page=2')).toBe('/admin/users?page=2');
    expect(safeHref('https://lyeve.com')).toBe('https://lyeve.com');
    expect(safeHref('?page=2')).toBe('?page=2');
    expect(safeHref('#top')).toBe('#top');
  });

  it('refuses a scheme that executes', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('JavaScript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('refuses a scheme the browser reads past whitespace and control characters', () => {
    // The URL parser trims leading whitespace and strips tab, line feed and
    // carriage return from anywhere in the value, so each of these navigates.
    // An anchored test on the raw string reads an unknown scheme and allows it.
    expect(safeHref('  javascript:alert(1)')).toBeUndefined();
    expect(safeHref('\njavascript:alert(1)')).toBeUndefined();
    expect(safeHref('java\tscript:alert(1)')).toBeUndefined();
    expect(safeHref('java\r\nscript:alert(1)')).toBeUndefined();
  });

  it('answers nothing for a link that was never given', () => {
    expect(safeHref(undefined)).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
    // An empty href resolves to the current page, which is a control that
    // reloads rather than one that is inert.
    expect(safeHref('')).toBeUndefined();
  });

  it('keeps a path that merely mentions a denied scheme', () => {
    // The rule is about the scheme this URL uses, not about the letters in it.
    expect(safeHref('/docs/javascript:guide')).toBe('/docs/javascript:guide');
    expect(safeHref('/files?src=data:image')).toBe('/files?src=data:image');
  });
});
