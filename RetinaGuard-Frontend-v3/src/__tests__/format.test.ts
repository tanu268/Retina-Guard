import { describe, it, expect } from 'vitest';
import { isTrue } from '../lib/format';

describe('isTrue', () => {
  // SQLite integer booleans
  it('returns true for integer 1', () => expect(isTrue(1)).toBe(true));
  it('returns false for integer 0', () => expect(isTrue(0)).toBe(false));

  // JS booleans (e.g. after JSON.parse on a refreshed response)
  it('returns true for boolean true', () => expect(isTrue(true)).toBe(true));
  it('returns false for boolean false', () => expect(isTrue(false)).toBe(false));

  // Null / undefined -- must never throw
  it('returns false for null', () => expect(isTrue(null)).toBe(false));
  it('returns false for undefined', () => expect(isTrue(undefined)).toBe(false));
});
