import { describe, expect, it } from 'vitest';
import { scrollEdges } from './scroll-edges.js';

describe('scrollEdges', () => {
  it('reports nothing while the content fits', () => {
    expect(scrollEdges({ scrollWidth: 400, clientWidth: 400, scrollLeft: 0 })).toEqual({
      before: false,
      after: false,
    });
  });

  it('marks only the edge the content continues past', () => {
    expect(scrollEdges({ scrollWidth: 900, clientWidth: 400, scrollLeft: 0 })).toEqual({
      before: false,
      after: true,
    });
    expect(scrollEdges({ scrollWidth: 900, clientWidth: 400, scrollLeft: 250 })).toEqual({
      before: true,
      after: true,
    });
    expect(scrollEdges({ scrollWidth: 900, clientWidth: 400, scrollLeft: 500 })).toEqual({
      before: true,
      after: false,
    });
  });

  it('reads a right-to-left box, where the offset runs negative', () => {
    expect(scrollEdges({ scrollWidth: 900, clientWidth: 400, scrollLeft: -250 })).toEqual({
      before: true,
      after: true,
    });
  });

  it('treats the last fraction of a pixel as the end', () => {
    expect(scrollEdges({ scrollWidth: 900.4, clientWidth: 400, scrollLeft: 500.1 }).after).toBe(
      false,
    );
  });
});
