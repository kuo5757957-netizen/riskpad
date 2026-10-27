import type { LiquidationInput, PositionInput, RiskMode, RiskRewardInput, Side } from './formulas';

export type PositionFields = {
  capital: string;
  riskMode: RiskMode;
  riskPercent: string;
  riskAmount: string;
  entry: string;
  stop: string;
  leverage: string;
};

export type RiskRewardFields = {
  entry: string;
  stop: string;
  target: string;
};

export type LiquidationFields = {
  side: Side;
  entry: string;
  leverage: string;
  maintenanceMarginPercent: string;
};

/** Capital 10,000, risk 1%, entry 50,000, stop 49,000 → notional 5,000, qty 0.1. */
export const positionSample: PositionInput = {
  capital: 10_000,
  riskMode: 'percent',
  riskPercent: 1,
  riskAmount: 100,
  entry: 50_000,
  stop: 49_000,
  leverage: null,
};

export const positionSampleFields: PositionFields = {
  capital: '10000',
  riskMode: 'percent',
  riskPercent: '1',
  riskAmount: '100',
  entry: '50000',
  stop: '49000',
  leverage: '',
};

/** Entry 100, stop 90, target 130 → 1:3, potential PnL 30%. */
export const riskRewardSample: RiskRewardInput = {
  entry: 100,
  stop: 90,
  target: 130,
};

export const riskRewardSampleFields: RiskRewardFields = {
  entry: '100',
  stop: '90',
  target: '130',
};

/** Long, entry 100, 20x, maintenance margin 0.5% → liquidation ≈ 95.5. */
export const liquidationSample: LiquidationInput = {
  side: 'long',
  entry: 100,
  leverage: 20,
  maintenanceMarginPercent: 0.5,
};

export const liquidationSampleFields: LiquidationFields = {
  side: 'long',
  entry: '100',
  leverage: '20',
  maintenanceMarginPercent: '0.5',
};
