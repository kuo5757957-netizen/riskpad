import { describe, expect, it } from 'vitest';
import { parseDecimal } from './parse';

describe('parseDecimal', () => {
  it('reads plain, grouped, and fullwidth numbers', () => {
    expect(parseDecimal('50000')).toBe(50000);
    expect(parseDecimal('10,000')).toBe(10000);
    expect(parseDecimal(' 0.5 ')).toBe(0.5);
    expect(parseDecimal('１００')).toBe(100);
    expect(parseDecimal('０．５')).toBe(0.5);
  });

  it('rejects empty and non-numeric text', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('   ')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('12.3.4')).toBeNull();
  });
});
