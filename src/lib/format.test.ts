import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent, formatRMultiple, formatRiskRewardRatio } from './format';

describe('formatters', () => {
  it('formats the sample figures in zh-TW', () => {
    expect(formatNumber(5000)).toBe('5,000');
    expect(formatNumber(0.1)).toBe('0.1');
    expect(formatNumber(95.5)).toBe('95.5');
    expect(formatPercent(30)).toBe('30%');
    expect(formatPercent(4.5)).toBe('4.5%');
  });

  it('prints an integer R multiple without trailing zeros', () => {
    expect(formatRMultiple(3)).toBe('3');
    expect(formatRMultiple(2.5)).toBe('2.5');
    expect(formatRiskRewardRatio(3)).toBe('1 : 3');
    expect(formatRiskRewardRatio(0)).toBe('—');
    expect(formatRiskRewardRatio(-1)).toBe('—');
  });
});
