import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent, formatRiskRewardRatio } from './format';
import {
  calcLiquidation,
  calcPositionSize,
  calcRiskReward,
  type FormulaErrorCode,
  type FormulaResult,
} from './formulas';
import { liquidationSample, positionSample, riskRewardSample } from './samples';

describe('RiskPad sample math', () => {
  it('sizes a position to notional 5000 and quantity 0.1', () => {
    const result = calcPositionSize(positionSample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.side).toBe('long');
    expect(result.value.riskAmount).toBe(100);
    expect(result.value.riskPercent).toBe(1);
    expect(result.value.quantity).toBeCloseTo(0.1, 10);
    expect(result.value.notional).toBeCloseTo(5000, 8);
    expect(result.value.margin).toBeNull();
    expect(formatNumber(result.value.notional)).toBe('5,000');
    expect(formatNumber(result.value.quantity)).toBe('0.1');
  });

  it('matches a fixed risk amount of 100 to the same position', () => {
    const result = calcPositionSize({
      ...positionSample,
      riskMode: 'amount',
      riskAmount: 100,
      riskPercent: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quantity).toBeCloseTo(0.1, 10);
    expect(result.value.notional).toBeCloseTo(5000, 8);
    expect(result.value.riskPercent).toBeCloseTo(1, 8);
  });

  it('scores a 1:3 reward-to-risk with 30% potential PnL', () => {
    const result = calcRiskReward(riskRewardSample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.side).toBe('long');
    expect(result.value.riskDistance).toBe(10);
    expect(result.value.rewardDistance).toBe(30);
    expect(result.value.rMultiple).toBeCloseTo(3, 10);
    expect(result.value.potentialPnlPercent).toBeCloseTo(30, 8);
    expect(result.value.stopLossPercent).toBeCloseTo(10, 8);
    expect(result.value.aligned).toBe(true);
    expect(formatRiskRewardRatio(result.value.rMultiple)).toBe('1 : 3');
    expect(formatPercent(result.value.potentialPnlPercent)).toBe('30%');
  });

  it('estimates a long liquidation price near 95.5', () => {
    const result = calcLiquidation(liquidationSample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.liquidationPrice).toBeCloseTo(95.5, 8);
    expect(result.value.maintenanceMarginRate).toBeCloseTo(0.005, 8);
    expect(result.value.distancePercent).toBeCloseTo(4.5, 8);
    expect(formatNumber(result.value.liquidationPrice)).toBe('95.5');
  });
});

function expectCode(result: FormulaResult<unknown>, code: FormulaErrorCode) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe(code);
}

describe('calcPositionSize', () => {
  it('sizes a short when the stop is above entry', () => {
    const result = calcPositionSize({ ...positionSample, stop: 51_000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.side).toBe('short');
    expect(result.value.quantity).toBeCloseTo(0.1, 10);
    expect(result.value.notional).toBeCloseTo(5000, 8);
  });

  it('converts leverage into margin without changing quantity', () => {
    const result = calcPositionSize({ ...positionSample, leverage: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quantity).toBeCloseTo(0.1, 10);
    expect(result.value.notional).toBeCloseTo(5000, 8);
    expect(result.value.margin).toBeCloseTo(500, 8);
    expect(result.value.marginExceedsCapital).toBe(false);
  });

  it('flags margin and notional that exceed capital', () => {
    const leveraged = calcPositionSize({
      capital: 1000,
      riskMode: 'amount',
      riskPercent: 0,
      riskAmount: 100,
      entry: 50_000,
      stop: 49_000,
      leverage: 2,
    });
    expect(leveraged.ok).toBe(true);
    if (!leveraged.ok) return;
    expect(leveraged.value.margin).toBeCloseTo(2500, 6);
    expect(leveraged.value.marginExceedsCapital).toBe(true);
    expect(leveraged.value.notionalExceedsCapital).toBe(false);

    const spot = calcPositionSize({
      capital: 1000,
      riskMode: 'amount',
      riskPercent: 0,
      riskAmount: 100,
      entry: 50_000,
      stop: 49_000,
      leverage: null,
    });
    expect(spot.ok).toBe(true);
    if (!spot.ok) return;
    expect(spot.value.notionalExceedsCapital).toBe(true);
    expect(spot.value.riskExceedsCapital).toBe(false);
  });

  it('flags a risk amount larger than capital', () => {
    const result = calcPositionSize({
      ...positionSample,
      riskMode: 'amount',
      riskAmount: 20_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.riskExceedsCapital).toBe(true);
    expect(result.value.riskPercent).toBeCloseTo(200, 6);
  });

  it('rejects prices that cannot define a distance', () => {
    expectCode(calcPositionSize({ ...positionSample, entry: 0 }), 'invalid-price');
    expectCode(calcPositionSize({ ...positionSample, stop: positionSample.entry }), 'same-price');
    expectCode(calcPositionSize({ ...positionSample, capital: 0 }), 'invalid-capital');
    expectCode(calcPositionSize({ ...positionSample, riskPercent: 0 }), 'invalid-risk');
    expectCode(calcPositionSize({ ...positionSample, leverage: 0 }), 'invalid-leverage');
  });
});

describe('calcRiskReward', () => {
  it('scores a short 1:3 the same way', () => {
    const result = calcRiskReward({ entry: 100, stop: 110, target: 70 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.side).toBe('short');
    expect(result.value.rMultiple).toBeCloseTo(3, 10);
    expect(result.value.potentialPnlPercent).toBeCloseTo(30, 8);
    expect(result.value.aligned).toBe(true);
  });

  it('marks a target on the stop side as unaligned', () => {
    const result = calcRiskReward({ entry: 100, stop: 90, target: 95 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.aligned).toBe(false);
    expect(result.value.rMultiple).toBeCloseTo(-0.5, 8);
    expect(result.value.potentialPnlPercent).toBeCloseTo(-5, 8);
    expect(formatRiskRewardRatio(result.value.rMultiple)).toBe('—');
  });

  it('rejects a missing target or a zero stop distance', () => {
    expectCode(calcRiskReward({ ...riskRewardSample, target: 0 }), 'invalid-target');
    expectCode(calcRiskReward({ entry: 100, stop: 100, target: 130 }), 'same-price');
  });
});

describe('calcLiquidation', () => {
  it('estimates a short liquidation at 104.5 with the same inputs', () => {
    const result = calcLiquidation({ ...liquidationSample, side: 'short' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.liquidationPrice).toBeCloseTo(104.5, 8);
    expect(formatNumber(result.value.liquidationPrice)).toBe('104.5');
  });

  it('drops maintenance margin to zero when the rate is 0%', () => {
    const result = calcLiquidation({ ...liquidationSample, maintenanceMarginPercent: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.liquidationPrice).toBeCloseTo(95, 8);
  });

  it('rejects leverage, margin rate, and prices that cannot liquidate on the loss side', () => {
    expectCode(calcLiquidation({ ...liquidationSample, leverage: 0 }), 'invalid-leverage');
    expectCode(calcLiquidation({ ...liquidationSample, maintenanceMarginPercent: 100 }), 'invalid-mmr');
    expectCode(calcLiquidation({ ...liquidationSample, maintenanceMarginPercent: -1 }), 'invalid-mmr');
    expectCode(calcLiquidation({ ...liquidationSample, entry: -5 }), 'invalid-price');
    expectCode(
      calcLiquidation({ ...liquidationSample, leverage: 1, maintenanceMarginPercent: 0 }),
      'liq-not-on-loss-side',
    );
  });
});
