import { describe, expect, it } from 'vitest';
import { inSentence } from './words.js';

describe('inSentence', () => {
  it.each([
    ['API key', 'API key'],
    ['Client ID', 'client ID'],
    ['Port', 'port'],
    ['URL', 'URL'],
    ['A', 'a'],
    ['', ''],
    ['2FA code', '2FA code'],
    ['GitHub token', 'GitHub token'],
    ['OAuth client', 'OAuth client'],
    ['LyEve key', 'LyEve key'],
    ['I agree', 'I agree'],
  ])('reads %j as %j', (label, expected) => {
    expect(inSentence(label)).toBe(expected);
  });
});
