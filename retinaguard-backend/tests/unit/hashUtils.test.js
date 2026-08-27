'use strict';
const { hashObject, canonicalJson, safeEqual } = require('../../src/utils/hash');

describe('hash utils', () => {
  it('canonicalJson is stable under key reordering', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it('hashObject changes when content changes', () => {
    expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }));
  });

  it('safeEqual matches equal strings and rejects unequal ones', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
